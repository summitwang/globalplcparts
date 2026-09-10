"use strict";

// GPLP-AUTO-002: no application imports, network, environment reads or writes.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT = "C:\\Projects\\globalplcparts";
const BASELINE_PATH = "automation/baselines/GPLP-AUTO-002-baseline-v1-revision-2.json";
const BASELINE_DIGEST = "aa98cce84169c6ff12207246214e4c56a384422f27579c520d750d8586c104f9";
const VERSION = Object.freeze({ schema: 2, collector: 2 });
const POLICY = Object.freeze({
  blocking: Object.freeze(["missingProductFields", "duplicateProductSlugGroups", "missingImageRecords", "missingLocalImageRecords", "missingBlogFields", "duplicateBlogSlugGroups", "invalidBlogDates", "missingPublicRoutes"]),
  advisory: Object.freeze(["missingBrandSlug", "missingDescriptions", "inconsistentBrandSlugGroups"]),
  proxy: Object.freeze(["duplicateDescriptionGroups", "duplicateBlogTitleGroups", "shortBlogDescriptionsUnder200Characters", "remoteImageRecords", "svgImageRecords", "heavilyReusedImagePaths", "productsOnHeavilyReusedPaths", "maximumImageReuse", "svgImagePercent", "heavyReuseProductPercent"]),
  dateProxy: Object.freeze(["distinctBlogDates"]),
  inventory: Object.freeze(["products", "brands", "categories", "blogs", "blogCategories", "uniqueImagePaths"]),
  scriptInventory: Object.freeze(["scriptFiles", "filenameRiskHeuristic", "registryHighRiskScripts", "scriptsWithoutRegistryRows", "missingDirectNodeEntryPoints", "checkImagesKeyOccurrences"]),
  seo: Object.freeze(["detailPagesWithMetadataMarker", "detailPagesWithCanonicalMarker", "detailPagesWithStructuredDataMarker", "layoutMetadataMarker", "sitemapCatalogMarker", "sitemapBlogMarker", "sitemapCurrentDateMarker", "robotsSitemapMarker"]),
});
const METRIC_KEYS = Object.freeze(Object.values(POLICY).flat());
const RATE_NUMERATORS = Object.freeze({ svgImagePercent: "svgImageRecords", heavyReuseProductPercent: "productsOnHeavilyReusedPaths" });
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
  ARGUMENT: "Command arguments are not supported in manual Stage 2.",
  BASELINE: "Baseline evidence is malformed, altered or does not match the approved identity.",
  COMPAT: "Baseline schema or collector version is incompatible; comparison was withheld.",
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
    if (stat.size > (relative === BASELINE_PATH ? 65536n : 32n * 1024n * 1024n)) stop("INPUT");
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
    const allowed = mode === "text" ? TEXT_INPUTS.includes(relative) || relative === BASELINE_PATH
      : mode === "directory" ? relative === "scripts"
        : ROUTES.includes(relative) || /^public\/product-images\/[A-Za-z0-9_ .()/+-]+\.(?:svg|png|jpe?g|webp|gif|avif)$/i.test(relative);
    if (!allowed) stop("PATH");
    const key = mode + ":" + relative;
    if (this.entries.has(key)) return this.entries.get(key).value;
    const captured = this.capture(relative, mode);
    this.entries.set(key, { relative, mode, ...captured });
    if (mode !== "metadata" && relative !== BASELINE_PATH && captured.value === null) stop("INPUT");
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

const canonical = (value) => value && typeof value === "object" && !Array.isArray(value)
  ? "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"
  : JSON.stringify(value);
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

function parseBaselineJSON(source) {
  // JSON.parse verifies grammar; this separate token walk rejects duplicate keys,
  // including escaped spellings and nested objects. No reviver/evaluation/import.
  try {
    if (typeof source !== "string" || Buffer.byteLength(source) > 65536) stop("BASELINE");
    const value = JSON.parse(source);
    const tokens = source.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:,]|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || [];
    let index = 0;
    function walk(depth) {
      if (depth > 32) stop("BASELINE");
      const token = tokens[index++];
      if (token === "{") {
        const seen = new Set();
        if (tokens[index] !== "}") {
          do {
            const key = JSON.parse(tokens[index++]);
            if (seen.has(key)) stop("BASELINE");
            seen.add(key);
            index++; // colon (grammar already validated)
            walk(depth + 1);
          } while (tokens[index] === "," && ++index);
        }
        index++;
      } else if (token === "[") {
        if (tokens[index] !== "]") do { walk(depth + 1); } while (tokens[index] === "," && ++index);
        index++;
      }
    }
    walk(0);
    if (index !== tokens.length) stop("BASELINE");
    return value;
  } catch { stop("BASELINE"); }
}

function validateMetrics(metrics, code = "INPUT") {
  if (!exactKeys(metrics, METRIC_KEYS)) stop(code);
  for (const key of METRIC_KEYS) {
    const n = metrics[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 ||
        (Object.hasOwn(RATE_NUMERATORS, key) ? n > 100 : !Number.isSafeInteger(n))) stop(code);
  }
  for (const key of POLICY.seo) if (metrics[key] > (key.startsWith("detailPages") ? 3 : 1)) stop(code);
  if (metrics.missingPublicRoutes > 5) stop(code);
  for (const [key, numerator] of Object.entries(RATE_NUMERATORS)) {
    if (metrics[numerator] > metrics.products || metrics[key] !== percent(metrics[numerator], metrics.products)) stop(code);
  }
}

function validateBaseline(source) {
  const b = parseBaselineJSON(source);
  if (!exactKeys(b, ["baselineFormatVersion", "taskId", "baselineId", "revision", "approvalStatus", "evidenceTimestamp", "sourceCommit", "schemaVersion", "collectorVersion", "metricDefinitionId", "gitEligibility", "nativeExitCode", "metrics"]) ||
      b.baselineFormatVersion !== 1 || b.taskId !== "GPLP-AUTO-002" || b.baselineId !== "GPLP-AUTO-002-baseline-v1" || b.revision !== 2 ||
      b.approvalStatus !== "APPROVED / ACTIVE INITIAL BASELINE" || b.evidenceTimestamp !== "2026-09-07T07:27:51.184Z" ||
      b.sourceCommit !== "ee6582e77001d2b9f09134e06a94c13a543f46e7" || b.metricDefinitionId !== "GPLP-AUTO-002-stage1-metrics-v1" ||
      !exactKeys(b.gitEligibility, ["state", "changedPaths", "branchClass"]) || b.gitEligibility.state !== "CLEAN" ||
      b.gitEligibility.changedPaths !== 0 || b.gitEligibility.branchClass !== "MAIN" || b.nativeExitCode !== 0) stop("BASELINE");
  validateMetrics(b.metrics, "BASELINE");
  if (!Number.isSafeInteger(b.schemaVersion) || b.schemaVersion < 1 || !Number.isSafeInteger(b.collectorVersion) || b.collectorVersion < 1) stop("BASELINE");
  // Only evidence 1/1 -> current report/collector 2/2 is explicitly supported.
  if (b.schemaVersion !== 1 || b.collectorVersion !== 1) stop("COMPAT");
  if (hash(canonical(b)) !== BASELINE_DIGEST) stop("BASELINE");
  return b;
}

function statusOf(...statuses) {
  const order = ["PASS", "ATTENTION", "BLOCKED", "CRITICAL STOP"];
  return order[Math.max(0, ...statuses.map((s) => order.indexOf(s)))];
}
const exitCodeFor = (status) => ({ PASS: 0, ATTENTION: 0, BLOCKED: 2, "CRITICAL STOP": 4 })[status] ?? 2;

function compareMetrics(current, baselineMetrics) {
  validateMetrics(current);
  if (baselineMetrics) validateMetrics(baselineMetrics, "BASELINE");
  const rows = [];
  for (const [group, keys] of Object.entries(POLICY)) for (const metric of keys) {
    const value = current[metric];
    const base = baselineMetrics ? baselineMetrics[metric] : null;
    const rate = Object.hasOwn(RATE_NUMERATORS, metric);
    const delta = base === null ? null : rate ? Number((value - base).toFixed(2)) : value - base;
    let direction = delta === null ? 0 : Math.sign(delta);
    if (rate && baselineMetrics && current.products && baselineMetrics.products) {
      const numerator = RATE_NUMERATORS[metric];
      const difference = BigInt(current[numerator]) * BigInt(baselineMetrics.products) - BigInt(baselineMetrics[numerator]) * BigInt(current.products);
      direction = difference > 0n ? 1 : difference < 0n ? -1 : 0;
    }
    let status = base === null ? "ATTENTION" : "PASS";
    let classification = base === null ? "COMPARISON UNAVAILABLE" : "ACCEPTED OBSERVATION / UNCHANGED";
    if ((group === "blocking" && value > 0) || ((metric === "products" || metric === "blogs") && value === 0)) {
      status = "BLOCKED"; classification = "VERIFIED LOCAL INTEGRITY FAILURE";
    } else if (base !== null && direction !== 0) {
      if (group === "proxy" || group === "advisory") {
        status = direction > 0 ? "ATTENTION" : "PASS";
        classification = direction > 0 ? "INCREASE / HUMAN REVIEW" : group === "proxy" ? "PROXY REDUCTION ONLY" : "ADVISORY COUNT REDUCTION";
      } else {
        status = "ATTENTION"; classification = "CHANGE / HUMAN REVIEW";
      }
    }
    rows.push({ metric, group, unit: rate ? "percent (delta: pp)" : "count", current: value,
      previous: null, baseline: base, deltaPrevious: null, deltaBaseline: delta, status, classification,
      unroundedRateChanged: rate && direction !== 0 && delta === 0 });
  }
  return { rows, status: statusOf(baselineMetrics ? "PASS" : "ATTENTION", ...rows.map((r) => r.status)) };
}

function collect({ root = ROOT, readGit = gitSnapshot, beforeVerify = () => {} } = {}) {
  const report = { task: "GPLP-AUTO-002", schema: VERSION.schema, collectorVersion: VERSION.collector,
    timestampUTC: new Date().toISOString(), status: "ATTENTION", coverage: "PARTIAL",
    baseline: "NOT AVAILABLE", findings: [], metrics: {}, comparison: [] };
  const finding = (id, severity, evidence, action) => report.findings.push({ id, severity, evidence, actionRequired: true, action, autonomy: "A", approvalRequired: true });
  try {
    const snapshot = new Snapshot(root);
    const git = readGit(root);
    if (!git.understood) stop("DIRTY");
    let approved = null;
    const baselineSource = snapshot.read(BASELINE_PATH);
    if (baselineSource !== null) {
      try { approved = validateBaseline(baselineSource); report.baseline = "APPROVED / ACTIVE INITIAL BASELINE"; }
      catch (error) {
        if (!(error instanceof Stop) || error.code !== "COMPAT") throw error;
        report.baseline = "INCOMPATIBLE";
      }
    }
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
    const compared = compareMetrics(m, git.branch === "MAIN" && approved ? approved.metrics : null);
    if (compared.status === "BLOCKED") finding("INTEGRITY", "HIGH", "VERIFIED LOCAL FAILURE", "Review the blocking metric rows before proposing scoped repairs.");
    if (compared.rows.some((r) => r.status === "ATTENTION" && r.baseline !== null)) finding("METRIC-CHANGES", "MEDIUM", "LOCAL METRIC DELTAS", "Review changed metric rows; quality proxies do not prove quality or authorize repair.");
    if (!approved) finding("BASELINE", "LOW", report.baseline, "Review baseline availability or compatibility; do not replace or advance it automatically.");
    if (git.branch !== "MAIN") finding("BRANCH", "LOW", "NON-MAIN BRANCH", "MAIN baseline comparison withheld; review branch context without changing Git state.");
    if (git.changedPaths) finding("GIT-REVIEW", "LOW", "KNOWN STAGE 1 PATHS ONLY", "Review the local implementation diff; do not commit or push automatically.");
    beforeVerify(); // Synthetic test seam only; never populated by the CLI.
    snapshot.verify();
    const afterGit = readGit(root);
    if (git.fingerprint !== afterGit.fingerprint) stop("CHANGED");
    snapshot.budget();
    report.git = { state: git.changedPaths ? "DIRTY" : "CLEAN", changedPaths: git.changedPaths, branch: git.branch };
    report.status = statusOf(compared.status, git.changedPaths || git.branch !== "MAIN" ? "ATTENTION" : "PASS");
    report.comparison = compared.rows;
    report.coverage = "COMPLETE WITHIN STAGE 2";
  } catch (error) {
    const code = error instanceof Stop && Object.hasOwn(ERRORS, error.code) ? error.code : "INPUT";
    report.status = code === "SENSITIVE" ? "CRITICAL STOP" : "BLOCKED";
    report.metrics = {};
    report.comparison = [];
    report.findings = [];
    report.failure = code;
    report.message = ERRORS[code];
  }
  return report;
}

function render(report) {
  // All strings below originate in reviewed code. No raw input or error strings are rendered.
  const lines = ["GlobalPLCParts Codex Operations", "Task ID: GPLP-AUTO-002", "Stage: 2 / MANUAL ONLY / Class A / STDOUT ONLY",
    `Status: ${report.status}`, `Coverage: ${report.coverage}`, `Baseline: ${report.baseline}`,
    "Schema / collector version: 2 / 2", "Metric definitions: GPLP-AUTO-002-stage1-metrics-v1",
    "Baseline reference: GPLP-AUTO-002-baseline-v1 revision 2; evidence schema/collector 1/1",
    "Previous: NOT AVAILABLE — HISTORY DEFERRED",
    "Validation: lint NOT RUN; health-check NOT RUN; build NOT RUN",
    "AUTO-001: NOT INVOKED; existing reports NOT READ"];
  if (report.timestampUTC) lines.push(`Timestamp UTC: ${report.timestampUTC}`);
  if (report.failure) lines.push(`Stop: ${ERRORS[report.failure]}`);
  if (report.git) lines.push(`Git state: ${report.git.state}; changed paths: ${report.git.changedPaths}; branch class: ${report.git.branch}`);
  lines.push("Metric | Unit | Current | Previous | Approved Baseline | Delta vs Previous | Delta vs Baseline | Classification");
  for (const row of report.comparison || []) {
    const delta = row.deltaBaseline === null ? "N/A" : row.deltaBaseline > 0 ? "+" + row.deltaBaseline : String(row.deltaBaseline);
    lines.push(`${row.metric} | ${row.unit} | ${row.current} | N/A / HISTORY DEFERRED | ${row.baseline ?? "N/A"} | N/A / HISTORY DEFERRED | ${delta} | ${row.status}: ${row.classification}${row.unroundedRateChanged ? " (underlying rate changed below display precision)" : ""}`);
  }
  lines.push("Prioritized human-reviewed next actions:");
  for (const [i, f] of report.findings.entries()) lines.push(`${i + 1}. ${f.id} | ${f.severity} | ${f.evidence} | Action required: YES | Class A review; approval required | ${f.action}`);
  lines.push("External evidence: NOT COLLECTED (Search Console, Analytics, hosting/Vercel, Cloudflare, Supabase, Resend, social platforms, live endpoints).",
    "Limits: source markers and image metadata do not prove runtime health, image relevance, licensing, indexing or factual accuracy.",
    "Automatic actions: observation and reporting only", "Automatic repairs: NONE", "Repository writes: NONE",
    "Production changes: NONE", "External services accessed: NONE", "Scheduler changes: NONE",
    "Environment/credential/customer stores accessed: NONE",
    report.status !== "PASS" ? "Action required: YES; human review only" : "Action required: NO; accepted observations remain visible");
  return lines.join("\n") + "\n";
}

if (require.main === module) {
  const report = process.argv.length === 2 ? collect() : {
    status: "BLOCKED", coverage: "PARTIAL", baseline: "NOT AVAILABLE", failure: "ARGUMENT", metrics: {}, findings: [], comparison: [],
  };
  process.stdout.write(render(report));
  process.exitCode = exitCodeFor(report.status);
}

module.exports = { collect, render, TEXT_INPUTS, ROUTES, BASELINE_PATH, POLICY, METRIC_KEYS, validateBaseline, compareMetrics, statusOf, exitCodeFor };
