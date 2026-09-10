"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { collect, render, TEXT_INPUTS, ROUTES, BASELINE_PATH, POLICY, METRIC_KEYS, validateBaseline, compareMetrics, statusOf, exitCodeFor } = require("../scripts/daily-operations-report.js");
const baselineText = fs.readFileSync(path.join(__dirname, "..", BASELINE_PATH), "utf8");
const approved = JSON.parse(baselineText);
const copy = (value) => JSON.parse(JSON.stringify(value));

function fixture(t) {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, "gplp-auto002-test-"));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), parent);
    assert.ok(path.basename(resolved).startsWith("gplp-auto002-test-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const write = (relative, text) => {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  };
  for (const file of [...TEXT_INPUTS, ...ROUTES]) write(file, "// metadata generateMetadata canonical application/ld+json products blogPosts sitemap");
  const product = { slug: "test-part", brand: "TEST", brandSlug: "test", model: "TEST-001", category: "TEST", description: "Synthetic description", image: "/product-images/test.png" };
  const post = { slug: "test-post", title: "TEST", category: "TEST", excerpt: "Synthetic excerpt", description: "Synthetic description", date: "2026-01-01" };
  write("data/products.json", JSON.stringify([product]));
  write("data/blog-posts.ts", "export const blogPosts = " + JSON.stringify([post]) + ";");
  write("package.json", JSON.stringify({ scripts: {} }));
  write("docs/SCRIPTS-SAFETY-REGISTRY.md", "# Synthetic registry\n");
  write("scripts/never-execute.js", "throw new Error('This fixture script must never execute');");
  write("public/product-images/test.png", "synthetic image metadata only");
  write(BASELINE_PATH, baselineText);
  const readGit = () => ({ understood: true, changedPaths: 0, branch: "MAIN", fingerprint: "synthetic-stable" });
  return { root, write, product, post, readGit };
}

test("valid synthetic collection does not write and has complete Stage 2 coverage", (t) => {
  const f = fixture(t);
  const contents = (directory) => fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).map((e) => {
    const file = path.join(directory, e.name);
    return [e.name, e.isDirectory() ? contents(file) : fs.readFileSync(file).toString("base64")];
  });
  const before = contents(f.root);
  const report = collect(f);
  assert.equal(report.status, "ATTENTION");
  assert.equal(report.baseline, "APPROVED / ACTIVE INITIAL BASELINE");
  assert.equal(report.metrics.products, 1);
  assert.equal(report.metrics.missingLocalImageRecords, 0);
  assert.equal(report.coverage, "COMPLETE WITHIN STAGE 2");
  assert.deepEqual(contents(f.root), before);
});

test("malformed JSON and executable blog source fail closed without raw error output", (t) => {
  const f = fixture(t);
  f.write("data/products.json", '{"malformed":"SYNTHETIC-PRIVATE-MARKER"');
  const report = collect(f);
  assert.equal(report.status, "BLOCKED");
  assert.deepEqual(report.metrics, {});
  assert.ok(!render(report).includes("SYNTHETIC-PRIVATE-MARKER"));
  f.write("data/products.json", JSON.stringify([f.product]));
  f.write("data/blog-posts.ts", "export const blogPosts = (() => { throw new Error('executed'); })();");
  assert.equal(collect(f).failure, "INPUT");
});

test("unexpected row and field types are rejected", (t) => {
  const f = fixture(t);
  for (const payload of [null, [null], [{ ...f.product, image: {} }]]) {
    f.write("data/products.json", JSON.stringify(payload));
    assert.equal(collect(f).status, "BLOCKED");
  }
});

test("missing referenced image is a verified failure, not a visual-quality inference", (t) => {
  const f = fixture(t);
  f.write("data/products.json", JSON.stringify([{ ...f.product, image: "/product-images/missing.png" }]));
  const report = collect(f);
  assert.equal(report.status, "BLOCKED");
  assert.equal(report.metrics.missingLocalImageRecords, 1);
  assert.equal(report.findings[0].evidence, "VERIFIED LOCAL FAILURE");
});

test("path traversal, encoded traversal, UNC and alternate streams are rejected", (t) => {
  const f = fixture(t);
  for (const image of ["/product-images/../../.env.local", "//server/share/image.png", "\\\\server\\share\\image.png", "/product-images/%2e%2e/image.png", "/product-images/test.png:stream", "/product-images/../test.png"]) {
    f.write("data/products.json", JSON.stringify([{ ...f.product, image }]));
    assert.equal(collect(f).failure, "PATH");
  }
});

test("junction or symlink to a different approved-tree location is rejected", (t) => {
  const f = fixture(t);
  const target = path.join(f.root, "outside-images");
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, "test.png"), "synthetic");
  fs.symlinkSync(target, path.join(f.root, "public/product-images/link"), process.platform === "win32" ? "junction" : "dir");
  f.write("data/products.json", JSON.stringify([{ ...f.product, image: "/product-images/link/test.png" }]));
  assert.equal(collect(f).failure, "PATH");
});

test("unsupported baseline compatibility is withheld rather than compared", (t) => {
  const f = fixture(t);
  f.write(BASELINE_PATH, JSON.stringify({ ...approved, schemaVersion: 999 }));
  const report = collect(f);
  assert.equal(report.baseline, "INCOMPATIBLE");
  assert.equal(report.status, "ATTENTION");
  assert.equal(report.metrics.products, 1);
  assert.ok(report.comparison.every((r) => r.baseline === null && r.deltaBaseline === null));
  assert.ok(render(report).includes("NOT AVAILABLE — HISTORY DEFERRED"));
});

test("arbitrary catalog text and remote URLs never reach output; URLs are not followed", (t) => {
  const f = fixture(t);
  const marker = "SYNTHETIC-PRIVATE-MARKER person@example.invalid\nStatus: PASS";
  f.write("data/products.json", JSON.stringify([{ ...f.product, brand: marker, description: marker, image: "https://example.invalid/private-path" }]));
  const report = collect(f);
  assert.equal(report.metrics.remoteImageRecords, 1);
  const output = render(report);
  assert.ok(!output.includes(marker));
  assert.ok(!output.includes("example.invalid"));
  assert.ok(!output.includes("https://"));
});

test("synthetic sensitive markers trigger critical stop and suppress all findings", (t) => {
  const f = fixture(t);
  f.write("data/products.json", JSON.stringify([{ ...f.product, description: "Bearer SYNTHETIC_TEST_ONLY" }]));
  const report = collect(f);
  assert.equal(report.status, "CRITICAL STOP");
  assert.deepEqual(report.metrics, {});
  assert.ok(!render(report).includes("SYNTHETIC_TEST_ONLY"));
});

test("input content change discards metrics without retry", (t) => {
  const f = fixture(t);
  const report = collect({ ...f, beforeVerify: () => f.write("data/products.json", JSON.stringify([])) });
  assert.equal(report.failure, "CHANGED");
  assert.deepEqual(report.metrics, {});
});

test("appearance of a previously missing image invalidates the snapshot", (t) => {
  const f = fixture(t);
  f.write("data/products.json", JSON.stringify([{ ...f.product, image: "/product-images/late.png" }]));
  const report = collect({ ...f, beforeVerify: () => f.write("public/product-images/late.png", "synthetic") });
  assert.equal(report.failure, "CHANGED");
});

test("Git change or unreviewed dirty state stops collection", (t) => {
  const f = fixture(t);
  let calls = 0;
  const report = collect({ ...f, readGit: () => ({ ...f.readGit(), fingerprint: String(calls++) }) });
  assert.equal(report.failure, "CHANGED");
  assert.equal(collect({ ...f, readGit: () => ({ ...f.readGit(), understood: false }) }).failure, "DIRTY");
});

test("raw exceptions from an adapter are never printed", (t) => {
  const f = fixture(t);
  const report = collect({ ...f, readGit: () => { throw new Error("SYNTHETIC-PRIVATE-MARKER"); } });
  assert.equal(report.status, "BLOCKED");
  assert.ok(!render(report).includes("SYNTHETIC-PRIVATE-MARKER"));
});

test("artifact matches every approved contract metric and policy covers exactly 42 unique keys", () => {
  const contract = fs.readFileSync(path.join(__dirname, "../docs/DAILY-OPERATIONS-REPORT-CONTRACT.md"), "utf8");
  const section = contract.split("### Exact v1 metric set")[1].split("Inventory counts")[0];
  const expected = {};
  for (const line of section.split(/\r?\n/).filter((s) => s.startsWith("| ") && s.includes("`"))) {
    const columns = line.split("|");
    const keys = [...columns[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const values = columns[3].replace(/\([^)]*\)/g, "").split(",").map(Number);
    assert.equal(keys.length, values.length);
    keys.forEach((key, i) => { assert.ok(!Object.hasOwn(expected, key)); expected[key] = values[i]; });
  }
  assert.equal(Object.keys(expected).length, 42);
  assert.deepEqual(approved.metrics, expected);
  assert.equal(METRIC_KEYS.length, 42);
  assert.equal(new Set(METRIC_KEYS).size, 42);
  assert.deepEqual([...METRIC_KEYS].sort(), Object.keys(expected).sort());
  assert.deepEqual(validateBaseline(baselineText), approved);
});

test("equal baseline yields PASS with accepted SVG, reuse and short-description observations", () => {
  const result = compareMetrics(copy(approved.metrics), approved.metrics);
  assert.equal(result.status, "PASS");
  assert.equal(result.rows.length, 42);
  assert.ok(result.rows.every((r) => r.deltaBaseline === 0 && r.status === "PASS"));
  for (const key of ["svgImageRecords", "heavilyReusedImagePaths", "shortBlogDescriptionsUnder200Characters"])
    assert.match(result.rows.find((r) => r.metric === key).classification, /ACCEPTED OBSERVATION/);
});

function changedMetrics(key, value) {
  const m = copy(approved.metrics);
  m[key] = value;
  m.svgImagePercent = m.products ? Math.round(m.svgImageRecords / m.products * 10000) / 100 : 0;
  m.heavyReuseProductPercent = m.products ? Math.round(m.productsOnHeavilyReusedPaths / m.products * 10000) / 100 : 0;
  return m;
}

for (const [key, value, status, delta] of [
  ["svgImageRecords", 80, "ATTENTION", 8], ["missingProductFields", 3, "BLOCKED", 3],
  ["products", 5400, "ATTENTION", 112], ["blogs", 295, "ATTENTION", -5],
  ["missingPublicRoutes", 1, "BLOCKED", 1], ["svgImageRecords", 60, "PASS", -12],
  ["heavilyReusedImagePaths", 20, "PASS", -16],
]) test(`comparison example: ${key} to ${value}`, () => {
  const result = compareMetrics(changedMetrics(key, value), approved.metrics);
  assert.equal(result.status, status);
  assert.equal(result.rows.find((r) => r.metric === key).deltaBaseline, delta);
  if (status === "PASS") assert.match(result.rows.find((r) => r.metric === key).classification, /PROXY REDUCTION ONLY/);
});

test("all policy classes enforce increases and decreases without proxy failures", () => {
  for (const [group, keys] of Object.entries(POLICY)) for (const key of keys) {
    if (key.endsWith("Percent")) continue;
    const base = approved.metrics[key];
    const value = group === "seo" ? base - 1 : base + 1;
    const row = compareMetrics(changedMetrics(key, value), approved.metrics).rows.find((r) => r.metric === key);
    assert.equal(row.status, group === "blocking" ? "BLOCKED" : "ATTENTION", key);
    if (base > 0 && group !== "seo") {
      const lower = compareMetrics(changedMetrics(key, base - 1), approved.metrics).rows.find((r) => r.metric === key);
      assert.equal(lower.status, ["proxy", "advisory"].includes(group) ? "PASS" : "ATTENTION", key);
    }
  }
});

test("empty catalogs/blogs block independently of baseline and rates", () => {
  for (const key of ["products", "blogs"]) {
    const m = changedMetrics(key, 0);
    if (key === "products") { m.svgImageRecords = 0; m.productsOnHeavilyReusedPaths = 0; }
    assert.equal(compareMetrics(m, approved.metrics).status, "BLOCKED");
    assert.equal(compareMetrics(m, null).status, "BLOCKED");
  }
});

test("percentage-point deltas and count increases cannot be hidden by denominators or rounding", () => {
  const m = changedMetrics("svgImageRecords", 80);
  assert.equal(compareMetrics(m, approved.metrics).rows.find((r) => r.metric === "svgImagePercent").deltaBaseline, 0.15);
  const diluted = changedMetrics("products", 10000);
  diluted.svgImageRecords = 80; diluted.svgImagePercent = 0.8;
  const result = compareMetrics(diluted, approved.metrics);
  assert.equal(result.rows.find((r) => r.metric === "svgImageRecords").status, "ATTENTION");
  const tiny = changedMetrics("products", 5287);
  const row = compareMetrics(tiny, approved.metrics).rows.find((r) => r.metric === "svgImagePercent");
  assert.equal(row.deltaBaseline, 0);
  assert.equal(row.status, "ATTENTION");
  assert.equal(row.unroundedRateChanged, true);
});

const badBaselines = {
  "malformed JSON": () => "{",
  "duplicate top-level key": () => baselineText.replace('"revision": 2', '"revision": 2, "revision": 2'),
  "escaped duplicate nested key": () => baselineText.replace('"products": 5288', '"products": 5288, "\\u0070roducts": 5288'),
  "missing metric": (b) => { delete b.metrics.products; },
  "extra metric": (b) => { b.metrics.extra = 0; },
  "wrong type": (b) => { b.metrics.products = "5288"; },
  "negative count": (b) => { b.metrics.products = -1; },
  "fractional count": (b) => { b.metrics.products = 1.5; },
  "invalid percentage range": (b) => { b.metrics.svgImagePercent = 101; },
  "invalid marker range": (b) => { b.metrics.layoutMetadataMarker = 2; },
  "wrong percentage evidence": (b) => { b.metrics.svgImagePercent = 1.37; },
  "wrong task": (b) => { b.taskId = "OTHER"; },
  "wrong ID": (b) => { b.baselineId = "OTHER"; },
  "wrong revision": (b) => { b.revision = 3; },
  "wrong source commit": (b) => { b.sourceCommit = "a".repeat(40); },
  "wrong approval": (b) => { b.approvalStatus = "DRAFT"; },
  "dirty evidence": (b) => { b.gitEligibility.state = "DIRTY"; },
  "changed-path evidence": (b) => { b.gitEligibility.changedPaths = 1; },
  "wrong branch evidence": (b) => { b.gitEligibility.branchClass = "OTHER"; },
  "wrong native exit": (b) => { b.nativeExitCode = 2; },
  "altered valid metric digest": (b) => { b.metrics.scriptFiles++; },
  "unknown field": (b) => { b.unknown = "SYNTHETIC-PRIVATE-MARKER"; },
  "invalid schema type": (b) => { b.schemaVersion = "1"; },
};
for (const [name, change] of Object.entries(badBaselines)) test(`baseline rejected: ${name}`, () => {
  const b = copy(approved);
  const raw = change(b) || JSON.stringify(b);
  assert.throws(() => validateBaseline(raw), (e) => e.code === "BASELINE");
});

test("only the explicit evidence 1/1 to Stage 2 mapping is supported", () => {
  assert.equal(validateBaseline(baselineText).collectorVersion, 1);
  for (const key of ["schemaVersion", "collectorVersion"]) {
    const b = copy(approved); b[key] = 2;
    assert.throws(() => validateBaseline(JSON.stringify(b)), (e) => e.code === "COMPAT");
  }
});

test("missing baseline is ATTENTION without fabricated deltas", (t) => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, BASELINE_PATH));
  const report = collect(f);
  assert.equal(report.status, "ATTENTION");
  assert.equal(report.baseline, "NOT AVAILABLE");
  assert.ok(report.comparison.every((r) => r.baseline === null));
});

test("malformed baseline produces sanitized BLOCKED output", (t) => {
  const f = fixture(t); f.write(BASELINE_PATH, '{"SYNTHETIC-PRIVATE-MARKER":');
  const report = collect(f);
  assert.equal(report.status, "BLOCKED");
  assert.deepEqual(report.comparison, []);
  assert.ok(!render(report).includes("SYNTHETIC-PRIVATE-MARKER"));
  assert.ok(render(report).includes("Action required: YES"));
});

test("baseline mutation is detected before report emission", (t) => {
  const f = fixture(t);
  const report = collect({ ...f, beforeVerify: () => f.write(BASELINE_PATH, baselineText + "\n") });
  assert.equal(report.failure, "CHANGED");
  assert.deepEqual(report.comparison, []);
});

test("baseline ancestor junction escape is rejected", (t) => {
  const f = fixture(t);
  const directory = path.join(f.root, "automation/baselines");
  const moved = path.join(f.root, "synthetic-baseline-target");
  for (const target of [directory, moved]) {
    const relative = path.relative(f.root, path.resolve(target));
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  }
  fs.renameSync(directory, moved);
  fs.symlinkSync(moved, directory, process.platform === "win32" ? "junction" : "dir");
  assert.equal(collect(f).failure, "PATH");
});

test("historical source commit mismatch is allowed; current HEAD change is blocked", (t) => {
  const f = fixture(t);
  const git = { ...f.readGit(), commit: "b".repeat(40), fingerprint: "stable-new-commit" };
  const report = collect({ ...f, readGit: () => git });
  assert.equal(report.coverage, "COMPLETE WITHIN STAGE 2");
  assert.equal(report.schema, 2); assert.equal(report.collectorVersion, 2);
  let call = 0;
  assert.equal(collect({ ...f, readGit: () => ({ ...git, fingerprint: String(call++) }) }).failure, "CHANGED");
});

test("non-MAIN and known dirty state remain ATTENTION; unknown dirty state blocks", (t) => {
  const f = fixture(t);
  const nonMain = collect({ ...f, readGit: () => ({ ...f.readGit(), branch: "OTHER" }) });
  assert.equal(nonMain.status, "ATTENTION");
  assert.ok(nonMain.comparison.every((r) => r.baseline === null));
  assert.equal(collect({ ...f, readGit: () => ({ ...f.readGit(), changedPaths: 3 }) }).status, "ATTENTION");
  assert.equal(collect({ ...f, readGit: () => ({ ...f.readGit(), understood: false }) }).status, "BLOCKED");
});

test("incomplete current metrics are rejected rather than zero-filled", () => {
  const m = copy(approved.metrics); delete m.products;
  assert.throws(() => compareMetrics(m, approved.metrics), (e) => e.code === "INPUT");
});

test("status precedence and actual synthetic Node exit codes", () => {
  assert.equal(statusOf("PASS", "ATTENTION", "BLOCKED", "CRITICAL STOP"), "CRITICAL STOP");
  assert.equal(statusOf("BLOCKED", "ATTENTION"), "BLOCKED");
  for (const [status, code] of Object.entries({ PASS: 0, ATTENTION: 0, BLOCKED: 2, "CRITICAL STOP": 4 })) {
    assert.equal(exitCodeFor(status), code);
    // Module import only: no collection, no Git or production inputs.
    const result = spawnSync(process.execPath, ["-e", `process.exitCode = require('./scripts/daily-operations-report.js').exitCodeFor(${JSON.stringify(status)})`], { cwd: path.join(__dirname, ".."), encoding: "utf8" });
    assert.equal(result.status, code);
    assert.equal(result.stdout, ""); assert.equal(result.stderr, "");
  }
});

test("collector uses only approved built-ins and contains no network, environment or write API", () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/daily-operations-report.js"), "utf8");
  const modules = [...source.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.deepEqual(modules, ["node:fs", "node:path", "node:crypto", "node:child_process"]);
  assert.doesNotMatch(source, /process\.env|\bfetch\s*\(|fs\.(?:write|append|mkdir|rm|unlink|rename|truncate|copyFile)/);
  assert.match(source, /fs\.openSync\(file, "r"\)/);
});
