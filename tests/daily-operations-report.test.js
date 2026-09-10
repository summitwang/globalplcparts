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

test("valid synthetic collection does not write and has complete Stage 3 coverage", (t) => {
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
  assert.equal(report.coverage, "COMPLETE WITHIN STAGE 3");
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
  assert.ok(render(report).includes("DIRECT COLLECTOR HAS NO HISTORY ACCESS"));
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

test("only the explicit evidence 1/1 to current metrics mapping is supported", () => {
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
  assert.equal(report.coverage, "COMPLETE WITHIN STAGE 3");
  assert.equal(report.schema, 3); assert.equal(report.collectorVersion, 3);
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

const history = require("../automation/auto002-history.js");
const runner = require("../automation/run-daily-operations.js");
const { ROOT } = require("../scripts/daily-operations-report.js");
const ids = Array.from({ length: 6 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
function syntheticReport(metrics = approved.metrics, timestampUTC = "2026-09-10T07:00:00.000Z") {
  const comparison = compareMetrics(metrics, approved.metrics);
  return { task: "GPLP-AUTO-002", schema: 3, collectorVersion: 3, repository: ROOT, timestampUTC,
    coverage: "COMPLETE WITHIN STAGE 3", baseline: "APPROVED / ACTIVE INITIAL BASELINE", approvedBaseline: copy(approved),
    git: { state: "CLEAN", changedPaths: 0, branch: "MAIN", head: "b".repeat(40) },
    metrics: copy(metrics), comparison: comparison.rows, status: comparison.status, findings: [], nativeExitCode: exitCodeFor(comparison.status) };
}
function syntheticRunner(report, store, runId = ids[0]) {
  return runner.run({ execute: () => ({ status: report.nativeExitCode, stdout: JSON.stringify(report) }), store, runId });
}
function historyFixture(t) {
  const f = fixture(t);
  const root = path.join(f.root, "history");
  fs.mkdirSync(root);
  return { ...f, historyRoot: root, store: () => new history.HistoryStore(root) };
}

test("history first and subsequent runs publish immutable complete observations and Previous", (t) => {
  const f = historyFixture(t);
  const first = syntheticRunner(syntheticReport(), f.store());
  assert.equal(first.exitCode, 0);
  assert.match(first.output, /WRITTEN \/ IMMUTABLE/);
  const file = path.join(f.historyRoot, ids[0], "observation.json");
  const before = fs.readFileSync(file, "utf8");
  const observation = history.validateObservation(before, ids[0], approved);
  assert.equal(Object.keys(observation.metrics).length, 42);
  assert.equal(observation.previousRunId, null);
  assert.equal(Date.parse(observation.timestampUTC), Date.parse(observation.timestampLocal));
  const second = syntheticRunner(syntheticReport(approved.metrics, "2026-09-11T07:00:00.000Z"), f.store(), ids[1]);
  assert.equal(second.exitCode, 0);
  assert.equal(second.report.comparison.every((r) => r.persistence === "UNCHANGED" && r.deltaPrevious === 0), true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.historyRoot, ids[1], "observation.json"))).previousRunId, ids[0]);
  assert.equal(fs.readFileSync(file, "utf8"), before);
  assert.deepEqual(fs.readdirSync(path.join(f.historyRoot, ids[0])).sort(), ["observation.json", "report.txt"]);
});

test("Previous selects newest strictly earlier eligible ATTENTION and reports skipped records", (t) => {
  const f = historyFixture(t);
  const m = { ...approved.metrics, scriptFiles: 48 };
  syntheticRunner(syntheticReport(m, "2026-09-08T07:00:00.000Z"), f.store(), ids[0]);
  syntheticRunner(syntheticReport(m, "2026-09-09T07:00:00.000Z"), f.store(), ids[1]);
  syntheticRunner(syntheticReport(m, "2026-09-12T07:00:00.000Z"), f.store(), ids[2]);
  fs.mkdirSync(path.join(f.historyRoot, ids[3])); // abandoned temp, not a committed observation
  fs.writeFileSync(path.join(f.historyRoot, ids[3], "observation.json.tmp"), "incomplete");
  const store = f.store(); store.initialize();
  const selection = store.select("2026-09-10T07:00:00.000Z", approved);
  assert.equal(selection.previous.runId, ids[1]);
  assert.equal(selection.skipped, 2);
});

test("all seven persistence labels, proxy reductions and inventory reversals", () => {
  const row = (key, current, prior) => history.comparePrevious(current, approved.metrics, prior && { metrics: prior }).rows.find((r) => r.metric === key);
  const base = approved.metrics;
  const higher = { ...base, duplicateDescriptionGroups: 2 };
  assert.equal(row("duplicateDescriptionGroups", higher, null).persistence, "NOT COMPARABLE");
  assert.equal(row("duplicateDescriptionGroups", higher, base).persistence, "NEW");
  assert.equal(row("duplicateDescriptionGroups", higher, higher).persistence, "PERSISTENT");
  assert.equal(row("duplicateDescriptionGroups", { ...higher, duplicateDescriptionGroups: 3 }, higher).persistence, "REGRESSED FURTHER");
  assert.equal(row("duplicateDescriptionGroups", base, higher).persistence, "PROXY REDUCTION");
  assert.equal(row("duplicateDescriptionGroups", base, base).persistence, "UNCHANGED");
  const resolved = row("scriptFiles", base, { ...base, scriptFiles: 48 });
  assert.equal(resolved.persistence, "RESOLVED");
  assert.equal(resolved.status, "ATTENTION"); // reversal still requires inventory review
});

test("previous rate comparison retains pp deltas and subprecision direction", () => {
  const previous = { ...approved.metrics, products: 1000000, svgImageRecords: 10000, svgImagePercent: 1, heavyReuseProductPercent: 0.28 };
  const current = { ...previous, svgImageRecords: 10001 };
  const rows = history.comparePrevious(current, approved.metrics, { metrics: previous }).rows;
  const rate = rows.find((r) => r.metric === "svgImagePercent");
  assert.equal(rate.deltaPrevious, 0);
  assert.equal(rate.previousUnroundedRateChanged, true);
  assert.equal(rate.status, "ATTENTION");
  assert.equal(rows.find((r) => r.metric === "svgImageRecords").deltaPrevious, 1);
});

for (const [label, mutate] of Object.entries({
  "wrong repository": (o) => { o.repository = "C:\\elsewhere"; },
  "dirty Git": (o) => { o.gitState = "DIRTY"; o.changedPaths = 1; },
  "non MAIN": (o) => { o.branch = "OTHER"; },
  "unsupported schema": (o) => { o.schemaVersion = 2; },
  "unsupported collector": (o) => { o.collectorVersion = 2; },
  "wrong definition": (o) => { o.metricDefinitionId = "unknown"; },
  "wrong baseline": (o) => { o.baselineRevision = 3; },
  "missing metric": (o) => { delete o.metrics.products; },
  "extra sensitive field": (o) => { o.customer = "SYNTHETIC_PRIVATE"; },
  "BLOCKED": (o) => { o.status = "BLOCKED"; },
  "CRITICAL STOP": (o) => { o.status = "CRITICAL STOP"; },
  "exit code": (o) => { o.nativeExitCode = 2; },
  "safety stop": (o) => { o.safety.safetyStop = "STOP"; },
  "invalid timestamp": (o) => { o.timestampUTC = "invalid"; },
  "false local timestamp": (o) => { o.timestampLocal = "2026-09-09T07:00:00.000+00:00"; },
  "false comparison summary": (o) => { o.baselineComparison.ATTENTION = 1; },
})) test(`history rejects ${label}`, () => {
  const o = history.makeObservation(syntheticReport(), ids[0], null);
  mutate(o);
  assert.throws(() => history.validateObservation(JSON.stringify(o), ids[0], approved));
});

test("malformed/duplicate-key history is skipped with sanitized gap reporting", (t) => {
  const f = historyFixture(t);
  for (let i = 0; i < 2; i++) {
    fs.mkdirSync(path.join(f.historyRoot, ids[i]));
    fs.writeFileSync(path.join(f.historyRoot, ids[i], "observation.json"), i ? '{"runId":1,"runId":2}' : '{SYNTHETIC_PRIVATE https://invalid.example');
  }
  const result = syntheticRunner(syntheticReport(), f.store(), ids[2]);
  assert.equal(result.exitCode, 0);
  assert.match(result.output, /skipped\/unavailable: 2/);
  assert.doesNotMatch(result.output, /SYNTHETIC_PRIVATE|https:\/\//);
});

test("unsafe root, traversal and history junctions are rejected before reading", (t) => {
  assert.throws(() => new history.HistoryStore("\\\\host\\share"));
  const f = historyFixture(t);
  assert.throws(() => f.store().target("../escape"));
  fs.symlinkSync(f.root, path.join(f.historyRoot, ids[0]), process.platform === "win32" ? "junction" : "dir");
  const result = syntheticRunner(syntheticReport(), f.store(), ids[1]);
  assert.equal(result.exitCode, 2);
  assert.match(result.output, /HISTORY VALIDATION OR PERSISTENCE FAILED/);
  assert.equal(fs.existsSync(path.join(f.historyRoot, ids[1])), false);
});

test("history mutation and concurrent publication invalidate selection without retry", (t) => {
  const f = historyFixture(t);
  syntheticRunner(syntheticReport(), f.store(), ids[0]);
  const store = f.store(); store.initialize();
  store.select("2026-09-11T07:00:00.000Z", approved);
  fs.appendFileSync(path.join(f.historyRoot, ids[0], "observation.json"), " ");
  assert.throws(() => store.verify());
  const other = f.store(); other.initialize();
  other.select("2026-09-11T07:00:00.000Z", approved);
  fs.mkdirSync(path.join(f.historyRoot, ids[1]));
  assert.throws(() => other.publish(ids[2], "safe", null));
  assert.equal(fs.existsSync(path.join(f.historyRoot, ids[2])), false);
});

test("run ID collision never overwrites an existing observation", (t) => {
  const f = historyFixture(t);
  syntheticRunner(syntheticReport(), f.store(), ids[0]);
  const file = path.join(f.historyRoot, ids[0], "observation.json");
  const before = fs.readFileSync(file);
  const result = syntheticRunner(syntheticReport(approved.metrics, "2026-09-11T07:00:00.000Z"), f.store(), ids[0]);
  assert.equal(result.exitCode, 2);
  assert.deepEqual(fs.readFileSync(file), before);
  assert.equal(result.report.status, "PASS");
  assert.match(result.output, /Native collector exit code: 0/);
});

test("persistence error preserves current result, hides raw exception and makes one attempt", () => {
  let attempts = 0;
  const store = { initialize() {}, select: () => ({ previous: null, skipped: 0 }), publish() { attempts++; throw new Error("SYNTHETIC_PRIVATE https://invalid.example"); } };
  const result = syntheticRunner(syntheticReport(), store);
  assert.equal(attempts, 1);
  assert.equal(result.exitCode, 2);
  assert.equal(result.report.metrics.products, 5288);
  assert.equal(result.report.status, "PASS");
  assert.doesNotMatch(result.output, /SYNTHETIC_PRIVATE|https:\/\//);
  assert.match(result.output, /FAILED; CURRENT RESULT RETAINED/);
});

test("ineligible blocked/critical/dirty/nonMAIN runs never publish an observation", (t) => {
  const f = historyFixture(t);
  for (const [i, kind] of ["BLOCKED", "CRITICAL STOP", "DIRTY", "OTHER"].entries()) {
    const r = syntheticReport();
    if (i < 2) { r.status = kind; r.nativeExitCode = exitCodeFor(kind); if (kind === "BLOCKED") r.metrics.missingBlogFields = 1; }
    else if (kind === "DIRTY") { r.git.state = "DIRTY"; r.git.changedPaths = 1; r.status = "ATTENTION"; }
    else { r.git.branch = "OTHER"; r.status = "ATTENTION"; }
    const result = syntheticRunner(r, f.store(), ids[i]);
    assert.match(result.output, /REPORT ONLY \/ INELIGIBLE/);
    assert.equal(fs.existsSync(path.join(f.historyRoot, ids[i], "observation.json")), false);
    assert.equal(result.exitCode, r.nativeExitCode);
  }
});

test("runner timeout, bad transport and exit mismatch do not persist or leak stderr", () => {
  for (const child of [
    { error: new Error("SYNTHETIC_PRIVATE"), status: null, stderr: "SYNTHETIC_PRIVATE" },
    { status: 0, stdout: "SYNTHETIC_PRIVATE" },
    { status: 2, stdout: JSON.stringify(syntheticReport()) },
  ]) {
    const result = runner.run({ execute: () => child, store: { initialize() { assert.fail("must not access history"); } } });
    assert.equal(result.exitCode, 2);
    assert.doesNotMatch(result.output, /SYNTHETIC_PRIVATE/);
  }
});

test("transport rebuilds prose and rejects hostile metric/provenance content", () => {
  const r = syntheticReport();
  r.findings = [{ action: "SYNTHETIC_PRIVATE https://invalid.example" }];
  r.comparison = [{ metric: "SYNTHETIC_PRIVATE" }];
  assert.doesNotMatch(JSON.stringify(history.acceptTransport(JSON.stringify(r), 0)), /SYNTHETIC_PRIVATE/);
  r.metrics.products = "SYNTHETIC_PRIVATE";
  assert.throws(() => history.acceptTransport(JSON.stringify(r), 0));
});

test("operations queue is prioritized, fixed prose, proposed only; unchanged proxies do not alert", () => {
  const r = syntheticReport();
  assert.deepEqual(history.operationsQueue(r.comparison, r.git), []);
  const rows = compareMetrics({ ...approved.metrics, missingBlogFields: 1, scriptFiles: 48, duplicateDescriptionGroups: 2 }, approved.metrics).rows;
  const queue = history.operationsQueue(rows, r.git);
  assert.equal(queue[0].priority, 1);
  assert.ok(queue.every((q) => q.proposedOnly));
  assert.ok(queue.some((q) => q.id === "scripts"));
  const catalog = compareMetrics({ ...approved.metrics, brands: 18 }, approved.metrics).rows;
  assert.equal(history.operationsQueue(catalog, r.git)[0].id, "repository");
});

test("runner launch is fixed, bounded, shell-free and does not inherit environment", () => {
  assert.equal(runner.NODE, "C:\\Program Files\\nodejs\\node.exe");
  assert.equal(runner.COLLECTOR, ROOT + "\\scripts\\daily-operations-report.js");
  assert.deepEqual(runner.CHILD_OPTIONS.env, {});
  assert.equal(runner.CHILD_OPTIONS.shell, false);
  assert.equal(runner.CHILD_OPTIONS.timeout, 90000);
  assert.equal(runner.CHILD_OPTIONS.maxBuffer, 65536);
  for (const name of ["auto002-history.js", "run-daily-operations.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "../automation", name), "utf8");
    assert.doesNotMatch(source, /process\.env|\bfetch\s*\(|https?:\/\/|fs\.(?:rm|unlink|appendFile|copyFile)/);
  }
});

test("failure at final atomic rename leaves no eligible observation or automatic cleanup", (t) => {
  const f = historyFixture(t);
  const rename = fs.renameSync;
  let attempts = 0;
  fs.renameSync = (from, to) => {
    if (to === path.join(f.historyRoot, ids[0], "observation.json")) { attempts++; throw new Error("SYNTHETIC_PRIVATE"); }
    return rename(from, to);
  };
  let result;
  try { result = syntheticRunner(syntheticReport(), f.store(), ids[0]); }
  finally { fs.renameSync = rename; }
  assert.equal(result.exitCode, 2);
  assert.equal(attempts, 1);
  assert.deepEqual(fs.readdirSync(path.join(f.historyRoot, ids[0])).sort(), ["observation.json.tmp", "report.txt"]);
  const store = f.store(); store.initialize();
  assert.equal(store.select("2026-09-11T07:00:00.000Z", approved).previous, null);
});

test("latest timestamp tie withholds history; older ties do not hide a unique latest record", (t) => {
  const f = historyFixture(t);
  syntheticRunner(syntheticReport(), f.store(), ids[0]);
  syntheticRunner(syntheticReport(), f.store(), ids[1]);
  const store = f.store(); store.initialize();
  assert.throws(() => store.select("2026-09-11T07:00:00.000Z", approved));
  const newer = history.makeObservation(syntheticReport(approved.metrics, "2026-09-10T08:00:00.000Z"), ids[2], null);
  fs.mkdirSync(path.join(f.historyRoot, ids[2]));
  fs.writeFileSync(path.join(f.historyRoot, ids[2], "observation.json"), JSON.stringify(newer));
  const next = f.store(); next.initialize();
  assert.equal(next.select("2026-09-11T07:00:00.000Z", approved).previous.runId, ids[2]);
});

test("hard-linked and oversized observations fail history closed", (t) => {
  const f = historyFixture(t);
  syntheticRunner(syntheticReport(), f.store(), ids[0]);
  const file = path.join(f.historyRoot, ids[0], "observation.json");
  fs.linkSync(file, path.join(f.root, "synthetic-linked.json"));
  const store = f.store(); store.initialize();
  assert.throws(() => store.select("2026-09-11T07:00:00.000Z", approved));
  const g = historyFixture(t);
  fs.mkdirSync(path.join(g.historyRoot, ids[0]));
  fs.writeFileSync(path.join(g.historyRoot, ids[0], "observation.json"), " ".repeat(65537));
  const other = g.store(); other.initialize();
  assert.throws(() => other.select("2026-09-11T07:00:00.000Z", approved));
});

test("missing baseline withholds Previous and writes report only", (t) => {
  const f = historyFixture(t);
  const report = syntheticReport();
  report.approvedBaseline = null; report.baseline = "NOT AVAILABLE"; report.status = "ATTENTION";
  const result = syntheticRunner(report, f.store());
  assert.equal(result.exitCode, 0);
  assert.match(result.output, /REPORT ONLY \/ INELIGIBLE/);
  assert.equal(fs.existsSync(path.join(f.historyRoot, ids[0], "observation.json")), false);
});

test("fixed external parent is never automatically created and incomplete runs changing are detected", (t) => {
  const f = historyFixture(t);
  const missingParent = new history.HistoryStore(path.join(f.root, "absent-parent", "history"));
  assert.throws(() => missingParent.initialize());
  assert.equal(fs.existsSync(path.join(f.root, "absent-parent")), false);
  fs.mkdirSync(path.join(f.historyRoot, ids[0]));
  const store = f.store(); store.initialize(); store.select("2026-09-11T07:00:00.000Z", approved);
  fs.writeFileSync(path.join(f.historyRoot, ids[0], "observation.json"), JSON.stringify(history.makeObservation(syntheticReport(), ids[0], null)));
  assert.throws(() => store.verify());
});

test("injected real-shaped synthetic collection transport is accepted without repository writes", (t) => {
  const f = fixture(t);
  const report = collect({ ...f, readGit: () => ({ ...f.readGit(), commit: "b".repeat(40) }) });
  const transported = history.acceptTransport(JSON.stringify(report), exitCodeFor(report.status));
  assert.equal(transported.metrics.products, 1);
  assert.equal(transported.git.state, "CLEAN");
  assert.equal(history.eligible(transported), true);
});

test("a new proxy increase below baseline is NEW; history review requires action even on PASS", () => {
  const prior = { ...approved.metrics, shortBlogDescriptionsUnder200Characters: 100 };
  const current = { ...approved.metrics, shortBlogDescriptionsUnder200Characters: 101 };
  const row = history.comparePrevious(current, approved.metrics, { metrics: prior }).rows.find((r) => r.metric === "shortBlogDescriptionsUnder200Characters");
  assert.equal(row.status, "ATTENTION");
  assert.equal(row.persistence, "NEW");
  const report = syntheticReport();
  const text = runner.outputFor(report, history.operationsQueue(report.comparison, report.git, true), "GAPS", 1, 0);
  assert.match(text, /Action required: YES/);
  assert.doesNotMatch(text, /Action required: NO/);
});

test("history budget begins after collection rather than store construction", (t) => {
  const f = historyFixture(t);
  const store = f.store(); store.started = 0;
  assert.doesNotThrow(() => store.initialize());
  store.started = 0;
  assert.throws(() => store.select("2026-09-11T07:00:00.000Z", approved));
});

test("unexpected native exit remains visible and critical native exit retains precedence", () => {
  for (const native of [1, 4]) {
    const result = runner.run({ execute: () => ({ status: native, stdout: "invalid" }), store: {} });
    assert.equal(result.exitCode, native === 4 ? 4 : 2);
    assert.match(result.output, new RegExp(`Native collector exit code: ${native}`));
    assert.match(result.output, native === 4 ? /CRITICAL STOP/ : /BLOCKED/);
  }
});
