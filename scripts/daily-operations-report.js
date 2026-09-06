"use strict";

// GPLP-AUTO-002: no application imports, network, environment reads or writes.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT = "C:\\Projects\\globalplcparts";
const TEXT_INPUTS = Object.freeze([
  "data/products.json", "data/blog-posts.ts", "package.json",
  "docs/SCRIPTS-SAFETY-REGISTRY.md", "app/layout.tsx",
  "app/sitemap.ts", "app/robots.ts", "app/products/[slug]/page.tsx",
  "app/brands/[slug]/page.tsx", "app/blog/[slug]/page.tsx",
]);
const ROUTES = Object.freeze([
  "app/page.tsx", "app/products/page.tsx", "app/brands/page.tsx",
  "app/search/page.tsx", "app/blog/page.tsx",
]);
const STAGE_FILES = Object.freeze([
  "scripts/daily-operations-report.js",
  "tests/daily-operations-report.test.js",
  "docs/DAILY-OPERATIONS-REPORT-CONTRACT.md",
]);
const ERRORS = Object.freeze({
  INPUT: "Required input is missing, unreadable, oversized or has an unsupported format.",
  PATH: "An unsafe path or symbolic link was rejected before further collection.",
  CHANGED: "Inputs changed during collection; results were discarded. No retry attempted.",
  GIT: "Repository identity or Git state could not be verified safely.",
  DIRTY: "Working changes extend beyond the reviewed Stage 1 implementation files.",
  SENSITIVE: "Potential sensitive material was detected; input details were suppressed.",
  LIMIT: "Collection exceeded its resource limit; no retry attempted.",
  ARGUMENT: "Command arguments are not supported in manual Stage 1.",
});
class Stop extends Error {
  constructor(code) { super(code); this.code = code; }
}
const stop = (code) => { throw new Stop(code); };
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const signature = (s) => [s.dev, s.ino, s.mode, s.size, s.mtimeNs, s.ctimeNs].join(":");

// Check every existing ancestor, including ancestors of the approved root.
// Reject all symlinks/junctions, even ones pointing inside the root.
function checkedPath(root, relative) {
  if (!path.isAbsolute(root) || /^[/\\]{2}/.test(root) ||
      relative.includes("\\") || relative.includes(":") || relative.includes("%") ||
      relative.startsWith("/") || relative.split("/").some((x) => !x || x === "." || x === "..")) stop("PATH");
  const target = path.resolve(root, relative);
  const inside = path.relative(root, target);
  if (inside.startsWith("..") || path.isAbsolute(inside)) stop("PATH");
  const parsed = path.parse(target);
  let current = parsed.root;
  for (const part of target.slice(parsed.root.length).split(path.sep)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) stop("PATH");
    } catch (error) {
      if (error.code === "ENOENT") return target;
      throw error;
    }
  }
  return target;
}

class Snapshot {
  constructor(root) { this.root = root; this.entries = new Map(); this.started = Date.now(); }
  budget() { if (Date.now() - this.started > 60000) stop("LIMIT"); }
  capture(relative, mode) {
    this.budget();
    const file = checkedPath(this.root, relative);
    let stat;
    try { stat = fs.lstatSync(file, { bigint: true }); }
    catch (error) { if (error.code === "ENOENT") return { stamp: "MISSING", value: null }; throw error; }
    if (mode === "directory") {
      if (!stat.isDirectory()) stop("INPUT");
      const entries = fs.readdirSync(file, { withFileTypes: true });
      if (entries.length > 10000 || entries.some((e) => e.isSymbolicLink())) stop("PATH");
      const value = entries.filter((e) => e.isFile() && e.name.endsWith(".js")).map((e) => e.name).sort();
      return { stamp: signature(stat) + hash(JSON.stringify(entries.map((e) => [e.name, e.isFile(), e.isDirectory()]).sort())), value };
    }
    if (!stat.isFile()) stop("INPUT");
    if (mode === "metadata") return { stamp: signature(stat), value: true };
    if (stat.size > 32n * 1024n * 1024n) stop("INPUT");
    const fd = fs.openSync(file, "r");
    try {
      if (signature(fs.fstatSync(fd, { bigint: true })) !== signature(stat)) stop("CHANGED");
      const bytes = fs.readFileSync(fd);
      if (signature(fs.fstatSync(fd, { bigint: true })) !== signature(stat)) stop("CHANGED");
      checkedPath(this.root, relative);
      if (signature(fs.lstatSync(file, { bigint: true })) !== signature(stat)) stop("CHANGED");
      const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { stamp: signature(stat) + hash(bytes), value };
    } finally { fs.closeSync(fd); }
  }
  read(relative, mode = "text") {
    const allowed = mode === "text" ? TEXT_INPUTS.includes(relative)
      : mode === "directory" ? relative === "scripts"
        : ROUTES.includes(relative) || /^public\/product-images\/[A-Za-z0-9_ .()/+-]+\.(?:svg|png|jpe?g|webp|gif|avif)$/i.test(relative);
    if (!allowed) stop("PATH");
    const key = mode + ":" + relative;
    if (this.entries.has(key)) return this.entries.get(key).value;
    const captured = this.capture(relative, mode);
    this.entries.set(key, { relative, mode, ...captured });
    if (mode !== "metadata" && captured.value === null) stop("INPUT");
    return captured.value;
  }
  verify() {
    for (const entry of this.entries.values()) {
      if (this.capture(entry.relative, entry.mode).stamp !== entry.stamp) stop("CHANGED");
    }
  }
}

function gitSnapshot(root) {
  if (path.resolve(root).toLowerCase() !== path.resolve(ROOT).toLowerCase()) stop("GIT");
  const dotGit = checkedPath(root, ".git");
  if (!fs.lstatSync(dotGit).isDirectory()) stop("GIT");
  const run = (args) => execFileSync("C:\\Program Files\\Git\\cmd\\git.exe", [
    "--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...args,
  ], {
    cwd: root, encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024,
    windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"],
    // Literal child environment: do not read or forward parent environment values.
    env: { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "NUL", GIT_TERMINAL_PROMPT: "0" },
  });
  try {
    const top = run(["rev-parse", "--show-toplevel"]).trim();
    if (path.resolve(top).toLowerCase() !== path.resolve(root).toLowerCase()) stop("GIT");
    const commit = run(["rev-parse", "--verify", "HEAD"]).trim();
    if (!/^[a-f0-9]{40,64}$/.test(commit)) stop("GIT");
    const branch = run(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    const status = run(["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=all"]);
    const changes = status.split("\0").filter(Boolean);
    const understood = changes.every((line) => /^(?:\?\?| M|M |A |AM) /.test(line) && STAGE_FILES.includes(line.slice(3)));
    return { commit, branch: branch === "main" ? "MAIN" : branch === "HEAD" ? "DETACHED" : "OTHER",
      changedPaths: changes.length, understood, fingerprint: hash(commit + branch + status) };
  } catch { stop("GIT"); }
}

function parseRows(source, blog = false) {
  if (blog) {
    const match = /^export const blogPosts\s*=\s*([\s\S]*?);?\s*$/.exec(source.trim());
    if (!match) stop("INPUT");
    source = match[1];
  }
  let rows;
  try { rows = JSON.parse(source); } catch { stop("INPUT"); }
  if (!Array.isArray(rows) || rows.length > 100000 || rows.some((r) => !r || typeof r !== "object" || Array.isArray(r))) stop("INPUT");
  const fields = blog ? ["slug", "title", "category", "excerpt", "description", "date"]
    : ["slug", "brand", "brandSlug", "model", "category", "description", "image"];
  for (const row of rows) {
    if (Object.keys(row).some((key) => /^(?:password|secret|token|email|phone|customer|rfq|quotation|supplier|price|payment)(?:$|[_-])/i.test(key))) stop("SENSITIVE");
    for (const key of fields) {
      if (row[key] !== undefined && typeof row[key] !== "string") stop("INPUT");
      if (typeof row[key] === "string" && /(?:\bBearer\s+\S+|\b(?:sk|re)_[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\beyJ[\w-]+\.[\w-]+\.[\w-]+|[?&](?:token|signature|sig|key|X-Amz-Signature)=)/i.test(row[key])) stop("SENSITIVE");
    }
  }
  return rows;
}
const groups = (rows, key) => {
  const result = new Map();
  for (const row of rows) {
    const value = (row[key] || "").trim();
    if (value) result.set(value, (result.get(value) || 0) + 1);
  }
  return result;
};
const duplicates = (rows, key) => [...groups(rows, key).values()].filter((n) => n > 1).length;
const incomplete = (rows, keys) => rows.filter((r) => keys.some((k) => !r[k]?.trim())).length;
const percent = (n, total) => total ? Math.round(n / total * 10000) / 100 : 0;

function collect({ root = ROOT, readGit = gitSnapshot, beforeVerify = () => {}, baseline = null } = {}) {
  const report = { task: "GPLP-AUTO-002", schema: 1, collectorVersion: 1,
    timestampUTC: new Date().toISOString(), status: "ATTENTION", coverage: "PARTIAL",
    baseline: baseline === null ? "NOT ESTABLISHED" : "INCOMPATIBLE",
    findings: [], metrics: {} };
  const finding = (id, severity, evidence, action) => report.findings.push({ id, severity, evidence, actionRequired: true, action, autonomy: "A", approvalRequired: true });
  try {
    const snapshot = new Snapshot(root);
    const git = readGit(root);
    if (!git.understood) stop("DIRTY");
    const products = parseRows(snapshot.read("data/products.json"));
    const posts = parseRows(snapshot.read("data/blog-posts.ts"), true);
    const m = report.metrics;
    Object.assign(m, {
      products: products.length, brands: groups(products, "brand").size, categories: groups(products, "category").size,
      missingProductFields: incomplete(products, ["slug", "brand", "model", "category"]),
      duplicateProductSlugGroups: duplicates(products, "slug"), missingBrandSlug: incomplete(products, ["brandSlug"]),
      missingDescriptions: incomplete(products, ["description"]), duplicateDescriptionGroups: duplicates(products, "description"),
      blogs: posts.length, blogCategories: groups(posts, "category").size,
      missingBlogFields: incomplete(posts, ["slug", "title", "category", "excerpt", "description", "date"]),
      duplicateBlogSlugGroups: duplicates(posts, "slug"), duplicateBlogTitleGroups: duplicates(posts, "title"),
      distinctBlogDates: groups(posts, "date").size,
      invalidBlogDates: posts.filter((p) => !/^\d{4}-\d{2}-\d{2}$/.test(p.date || "") || !Number.isFinite(Date.parse(p.date)) || new Date(p.date).toISOString().slice(0, 10) !== p.date).length,
      shortBlogDescriptionsUnder200Characters: posts.filter((p) => (p.description || "").trim().length < 200).length,
    });
    const mappings = new Map();
    for (const p of products) {
      const key = (p.brand || "").trim();
      if (!mappings.has(key)) mappings.set(key, new Set());
      mappings.get(key).add((p.brandSlug || "").trim());
    }
    m.inconsistentBrandSlugGroups = [...mappings.values()].filter((s) => s.size > 1).length;
    const images = groups(products, "image");
    Object.assign(m, { uniqueImagePaths: images.size, missingImageRecords: incomplete(products, ["image"]),
      remoteImageRecords: 0, svgImageRecords: 0, missingLocalImageRecords: 0,
      heavilyReusedImagePaths: [...images.values()].filter((n) => n >= 20).length,
      productsOnHeavilyReusedPaths: [...images.values()].filter((n) => n >= 20).reduce((a, b) => a + b, 0),
      maximumImageReuse: Math.max(0, ...images.values()) });
    for (const [image, count] of images) {
      if (/^https?:\/\//i.test(image)) { m.remoteImageRecords += count; continue; }
      if (!image.startsWith("/product-images/") || image.startsWith("//")) stop("PATH");
      if (/\.svg$/i.test(image)) m.svgImageRecords += count;
      if (!snapshot.read("public" + image, "metadata")) m.missingLocalImageRecords += count;
    }
    m.svgImagePercent = percent(m.svgImageRecords, m.products);
    m.heavyReuseProductPercent = percent(m.productsOnHeavilyReusedPaths, m.products);
    m.missingPublicRoutes = ROUTES.filter((r) => !snapshot.read(r, "metadata")).length;
    m.detailPagesWithMetadataMarker = 0;
    m.detailPagesWithCanonicalMarker = 0;
    m.detailPagesWithStructuredDataMarker = 0;
    for (const file of TEXT_INPUTS.filter((p) => p.includes("[slug]"))) {
      const source = snapshot.read(file);
      m.detailPagesWithMetadataMarker += Number(source.includes("generateMetadata"));
      m.detailPagesWithCanonicalMarker += Number(source.includes("canonical"));
      m.detailPagesWithStructuredDataMarker += Number(source.includes("application/ld+json"));
    }
    m.layoutMetadataMarker = Number(snapshot.read("app/layout.tsx").includes("metadata"));
    m.sitemapCatalogMarker = Number(snapshot.read("app/sitemap.ts").includes("products"));
    m.sitemapBlogMarker = Number(snapshot.read("app/sitemap.ts").includes("blogPosts"));
    m.sitemapCurrentDateMarker = Number(snapshot.read("app/sitemap.ts").includes("new Date()"));
    m.robotsSitemapMarker = Number(snapshot.read("app/robots.ts").includes("sitemap"));
    const scripts = snapshot.read("scripts", "directory");
    const registry = snapshot.read("docs/SCRIPTS-SAFETY-REGISTRY.md");
    m.scriptFiles = scripts.length;
    m.filenameRiskHeuristic = scripts.filter((s) => /(scrape|import|image-(?:engine|scraper|mapper)|product-(?:expansion|image-engine)|generate|clean|fix|update|backfill)/i.test(s)).length;
    const registered = new Set([...registry.matchAll(/^\| `([^`]+\.js)` \|/gm)].map((x) => x[1]));
    m.scriptsWithoutRegistryRows = scripts.filter((s) => !registered.has(s)).length;
    m.registryHighRiskScripts = [...registry.matchAll(/^\| `([^`]+\.js)` \|.*\*\*HIGH-RISK[^\n]*$/gm)].filter((x) => scripts.includes(x[1])).length;
    let pkg;
    const packageText = snapshot.read("package.json");
    try { pkg = JSON.parse(packageText); } catch { stop("INPUT"); }
    if (!pkg.scripts || typeof pkg.scripts !== "object" || Array.isArray(pkg.scripts) || Object.values(pkg.scripts).some((v) => typeof v !== "string")) stop("INPUT");
    m.missingDirectNodeEntryPoints = Object.values(pkg.scripts).filter((s) => {
      const match = /^node scripts\/([a-zA-Z0-9_.-]+\.js)$/.exec(s);
      return match && !scripts.includes(match[1]);
    }).length;
    // Count a known raw-source ambiguity, without treating JSON.parse as duplicate-aware.
    m.checkImagesKeyOccurrences = [...packageText.matchAll(/"check-images"\s*:/g)].length;
    const failures = Number(m.products === 0) + Number(m.blogs === 0) + m.missingProductFields + m.duplicateProductSlugGroups + m.missingImageRecords +
      m.missingLocalImageRecords + m.missingBlogFields + m.duplicateBlogSlugGroups + m.invalidBlogDates + m.missingPublicRoutes;
    if (failures) finding("INTEGRITY", "HIGH", "VERIFIED LOCAL FAILURE", "Review missing fields, duplicate slugs, dates, image references or routes before proposing scoped repairs.");
    if (m.scriptsWithoutRegistryRows || m.missingDirectNodeEntryPoints || m.checkImagesKeyOccurrences > 1)
      finding("SCRIPT-INVENTORY", "MEDIUM", "STATIC INVENTORY", "Review registry coverage and package entry-point inconsistencies without executing scripts.");
    if (m.svgImageRecords || m.heavilyReusedImagePaths || m.remoteImageRecords)
      finding("IMAGE-REVIEW", "LOW", "QUALITY PROXY ONLY", "Review image relevance and fallback/reuse metrics; do not replace or acquire images.");
    if (m.shortBlogDescriptionsUnder200Characters || m.duplicateBlogTitleGroups || m.distinctBlogDates < 3)
      finding("CONTENT-REVIEW", "LOW", "QUALITY PROXY ONLY", "Review content depth, duplication and date provenance without publishing changes.");
    if (m.detailPagesWithMetadataMarker < 3 || m.detailPagesWithCanonicalMarker < 3 || m.detailPagesWithStructuredDataMarker < 3 || m.sitemapCurrentDateMarker)
      finding("SEO-REVIEW", "LOW", "SOURCE MARKERS ONLY", "Review metadata coverage and sitemap modification-date provenance; rendered SEO is unverified.");
    finding("BASELINE", "LOW", report.baseline, "Review this inventory before approving a versioned baseline and any future trend storage.");
    if (git.changedPaths) finding("GIT-REVIEW", "LOW", "KNOWN STAGE 1 PATHS ONLY", "Review the local implementation diff; do not commit or push automatically.");
    beforeVerify(); // Synthetic test seam only; never populated by the CLI.
    snapshot.verify();
    const afterGit = readGit(root);
    if (git.fingerprint !== afterGit.fingerprint) stop("CHANGED");
    snapshot.budget();
    report.git = { state: git.changedPaths ? "DIRTY" : "CLEAN", changedPaths: git.changedPaths, branch: git.branch };
    report.status = failures ? "BLOCKED" : "ATTENTION";
    report.coverage = "COMPLETE WITHIN STAGE 1";
  } catch (error) {
    const code = error instanceof Stop && Object.hasOwn(ERRORS, error.code) ? error.code : "INPUT";
    report.status = code === "SENSITIVE" ? "CRITICAL STOP" : "BLOCKED";
    report.metrics = {};
    report.findings = [];
    report.failure = code;
    report.message = ERRORS[code];
  }
  return report;
}

function render(report) {
  // All strings below originate in reviewed code. No raw input or error strings are rendered.
  const lines = ["GlobalPLCParts Codex Operations", "Task ID: GPLP-AUTO-002", "Stage: 1 / MANUAL ONLY / Class A / STDOUT ONLY",
    `Status: ${report.status}`, `Coverage: ${report.coverage}`, `Baseline: ${report.baseline}`,
    "Schema / collector version: 1 / 1", "Trends: NOT AVAILABLE; no approved baseline or history input",
    "Validation: lint NOT RUN; health-check NOT RUN; build NOT RUN",
    "AUTO-001: NOT INVOKED; existing reports NOT READ"];
  if (report.timestampUTC) lines.push(`Timestamp UTC: ${report.timestampUTC}`);
  if (report.failure) lines.push(`Stop: ${ERRORS[report.failure]}`);
  if (report.git) lines.push(`Git state: ${report.git.state}; changed paths: ${report.git.changedPaths}; branch class: ${report.git.branch}`);
  for (const [key, value] of Object.entries(report.metrics)) lines.push(`${key}: ${value}`);
  lines.push("Prioritized human-reviewed next actions:");
  for (const [i, f] of report.findings.entries()) lines.push(`${i + 1}. ${f.id} | ${f.severity} | ${f.evidence} | Action required: YES | Class A review; approval required | ${f.action}`);
  lines.push("External evidence: NOT COLLECTED (Search Console, Analytics, hosting/Vercel, Cloudflare, Supabase, Resend, social platforms, live endpoints).",
    "Limits: source markers and image metadata do not prove runtime health, image relevance, licensing, indexing or factual accuracy.",
    "Automatic actions: observation and reporting only", "Automatic repairs: NONE", "Repository writes: NONE",
    "Production changes: NONE", "External services accessed: NONE", "Scheduler changes: NONE",
    "Environment/credential/customer stores accessed: NONE", "Approval required: YES; human review only");
  return lines.join("\n") + "\n";
}

if (require.main === module) {
  const report = process.argv.length === 2 ? collect() : {
    status: "BLOCKED", coverage: "PARTIAL", baseline: "NOT ESTABLISHED", failure: "ARGUMENT", metrics: {}, findings: [],
  };
  process.stdout.write(render(report));
  process.exitCode = report.status === "CRITICAL STOP" ? 4 : report.status === "BLOCKED" ? 2 : 0;
}

module.exports = { collect, render, TEXT_INPUTS, ROUTES };
