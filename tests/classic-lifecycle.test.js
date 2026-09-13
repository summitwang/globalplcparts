"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const c = require("../scripts/classic-automation-complete-crawl");
const l = require("../scripts/classic-automation-lifecycle");
const original = { brand: "GE Fanuc", model: "IC693CPU331", slug: "ge-fanuc-ic693cpu331", category: "PLC", source: "ClassicAutomation", sourceUrl: "https://www.classicautomation.com/ic693cpu331" };
const scheduler = { status: "AVAILABLE", enabled: true, state: "Ready", lastResult: 0, nextRun: "2026-09-14T00:00:00+08:00" };
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gplp-final-test-"));
  fs.mkdirSync(path.join(root, "data"));
  t.after(() => { assert.ok(root.startsWith(path.join(os.tmpdir(), "gplp-final-test-"))); fs.rmSync(root, { recursive: true, force: true }); });
  const products = [structuredClone(original)];
  const state = c.initialState(products);
  for (const b of state.brands) {
    for (let i = 0; i < 2; i++) {
      Object.assign(b, { startTotal: 0, totalCount: 0, totalPages: 0, lastCommittedPage: 1, currentPage: 2, pageFingerprints: ["empty"] });
      c.finishSweep(b);
    }
  }
  state.status = "FULLY_COMPLETE";
  const write = (name, data) => fs.writeFileSync(path.join(root, "data", name), JSON.stringify(data));
  write("products.json", products); write(c.STATE_NAME, state);
  write("classic-complete-sweep-baseline.json", products);
  write("classic-complete-last-run.json", { status: "FULLY_COMPLETE" });
  return { root, state, products, write, finalize: () => l.finalize({ root, scheduler, version: "test-commit" }) };
}
test("INCOMPLETE state does not finalize", t => {
  const f = fixture(t); f.write(c.STATE_NAME, c.initialState(f.products));
  assert.equal(f.finalize().status, "NOT_COMPLETE");
  assert.equal(fs.existsSync(path.join(f.root, l.REPORT_DIR)), false);
});
for (const [name, mutate] of [
  ["one incomplete brand", s => { s.brands[0].complete = false; }],
  ["pending queue", s => { s.brands[0].pending = {}; }],
  ["unresolved failure", s => { s.brands[0].lastErrorCategory = "HTTP_403"; }],
  ["stable sweep count", s => { s.brands[0].stableSweeps = 1; }],
  ["all 17 targets required", s => { s.brands.pop(); }],
  ["duplicate target", s => { s.brands[1] = s.brands[0]; }],
  ["missing successful evidence", s => { s.brands[0].completionEvidence = null; }],
  ["nonconsecutive generations", s => { s.brands[0].completionEvidence.previousGeneration = 0; }],
]) test(name + " prevents finalization", t => {
  const f = fixture(t); mutate(f.state); f.write(c.STATE_NAME, f.state);
  assert.throws(f.finalize); assert.equal(fs.existsSync(path.join(f.root, l.REPORT_DIR)), false);
});
for (const [name, mutate] of [
  ["duplicate identity", p => { p.push({ ...p[0], slug: "different" }); }],
  ["duplicate slug", p => { p.push({ ...p[0], model: "different" }); }],
  ["missing identity", p => { p.push({ ...p[0], model: "" }); }],
  ["out-of-scope source", p => { p.push({ ...p[0], model: "new", slug: "new", sourceUrl: "https://example.com/new" }); }],
  ["historical modification", p => { p[0].category = "changed"; }],
]) test(name + " prevents finalization", t => {
  const f = fixture(t); mutate(f.products); f.write("products.json", f.products); assert.throws(f.finalize);
});
for (const name of ["products.json", c.STATE_NAME]) test("malformed " + name + " prevents finalization", t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.root, "data", name), "{broken"); assert.throws(f.finalize);
});
test("valid completion publishes durable evidence and report once, preserving history", t => {
  const f = fixture(t); const before = fs.readFileSync(path.join(f.root, "data/products.json"));
  const result = f.finalize(); assert.equal(result.status, "FINALIZED");
  const files = ["completion.json", "final-state.json", "summary.md"];
  const snapshots = files.map(n => fs.readFileSync(path.join(result.directory, n)));
  const times = files.map(n => fs.statSync(path.join(result.directory, n)).mtimeMs);
  const report = JSON.parse(snapshots[0]);
  assert.equal(report.brands.length, 17); assert.equal(report.integrity.result, "PASS");
  assert.equal(report.earlierWorkflowProductsPreserved, 1); assert.equal(report.codeVersion, "test-commit");
  assert.equal(f.finalize().status, "COMPLETE_NOOP");
  files.forEach((n, i) => { assert.deepEqual(fs.readFileSync(path.join(result.directory, n)), snapshots[i]); assert.equal(fs.statSync(path.join(result.directory, n)).mtimeMs, times[i]); });
  assert.deepEqual(fs.readFileSync(path.join(f.root, "data/products.json")), before);
});
test("completed batch plus finalizer is zero-network and zero catalog/state mutation", async t => {
  const f = fixture(t); let calls = 0;
  const catalog = fs.readFileSync(path.join(f.root, "data/products.json")), state = fs.readFileSync(path.join(f.root, "data", c.STATE_NAME));
  for (let i = 0; i < 2; i++) {
    const result = await c.runBatch({ root: f.root, source: { list() { calls++; throw Error("no network permitted"); } } });
    const output = l.afterBatch(result, { root: f.root, scheduler });
    assert.equal(output.status, "COMPLETE"); assert.equal(output.network, 0);
    assert.equal(output.finalization.status, i ? "COMPLETE_NOOP" : "FINALIZED");
  }
  assert.equal(calls, 0); assert.deepEqual(fs.readFileSync(path.join(f.root, "data/products.json")), catalog);
  assert.deepEqual(fs.readFileSync(path.join(f.root, "data", c.STATE_NAME)), state);
});
test("active mutation lock defers finalization", t => {
  const f = fixture(t), unlock = c.acquire(path.join(f.root, "data/classic-complete-catalog.lock"));
  try { assert.equal(f.finalize().status, "DEFERRED"); assert.equal(fs.existsSync(path.join(f.root, l.REPORT_DIR)), false); } finally { unlock(); }
});
test("resolved historical failures are reported and do not block completion", t => {
  const f = fixture(t); f.state.brands[0].failedRetryable = 2; f.state.brands[0].cumulativeFailures = 3;
  f.write(c.STATE_NAME, f.state); const r = f.finalize();
  assert.equal(JSON.parse(fs.readFileSync(path.join(r.directory, "completion.json"))).cumulativeFailures, 3);
});
test("tampered final evidence fails closed without overwriting report", t => {
  const f = fixture(t), r = f.finalize(); fs.writeFileSync(path.join(r.directory, "final-state.json"), "{}");
  assert.throws(f.finalize, /FINAL_REPORT_MISMATCH/);
});
test("historical public category and search references preserved, never granted to new rows", t => {
  const f = fixture(t);
  const old = { ...original, brand: "Allen Bradley", model: "1756-L71", sourceUrl: "https://www.classicautomation.com/catalogsearch/result/?q=Allen%20Bradley%201756-L71#contentarea" };
  const rows = [old]; f.state.initialCatalogHash = c.digest(JSON.stringify(rows));
  f.write("classic-complete-sweep-baseline.json", rows); f.write("products.json", rows); f.write(c.STATE_NAME, f.state);
  assert.equal(l.integrity(f.root, f.state, rows).historicalReferences, 1);
  assert.throws(() => l.integrity(f.root, f.state, [...rows, { ...old, slug: "new", model: "new" }]), /FINAL_SOURCE_SCOPE/);
});
test("progress provides current target, latest run, integrity and scheduler without crawling", t => {
  const f = fixture(t); f.write(c.STATE_NAME, c.initialState(f.products));
  const s = l.writeProgress({ root: f.root, scheduler, latest: { status: "INCOMPLETE", added: 0 } });
  assert.equal(s.overall, "RUNNING"); assert.equal(s.completedBrands, 0); assert.equal(s.remaining.length, 17);
  assert.equal(s.current.page, 1); assert.equal(s.scheduler.nextRun, scheduler.nextRun);
  assert.match(fs.readFileSync(path.join(f.root, l.REPORT_DIR, "status.md"), "utf8"), /CLASSIC AUTOMATION CRAWL STATUS/);
});
test("progress reports finalization failure as BLOCKED despite completed state", t => {
  const f = fixture(t); assert.equal(l.progress({ root: f.root, scheduler, latest: { status: "BLOCKED", error: "FINAL_REPORT_MISMATCH" } }).overall, "BLOCKED");
});
test("actual scheduled CLI entry point finalizes and repeats COMPLETE without catalog writes", t => {
  const f = fixture(t), scripts = path.join(f.root, "scripts"); fs.mkdirSync(scripts);
  for (const name of ["classic-automation-complete-crawl.js", "classic-automation-lifecycle.js", "product-image-files.js"])
    fs.copyFileSync(path.join(c.ROOT, "scripts", name), path.join(scripts, name));
  fs.mkdirSync(path.join(f.root, "lib"));
  fs.copyFileSync(path.join(c.ROOT, "lib/product-image-policy.js"), path.join(f.root, "lib/product-image-policy.js"));
  // A completed entry point must never load an acquisition adapter.
  fs.writeFileSync(path.join(scripts, "classic-automation-source.js"), 'throw new Error("UNEXPECTED_ACQUISITION");');
  const preload = path.join(f.root, "local-query-fixture.js");
  fs.writeFileSync(preload, `require('node:child_process').execFileSync = function(command) {
    if (command === 'powershell.exe') return '${JSON.stringify(scheduler)}';
    if (command === 'git') return 'test-commit';
    throw new Error('UNEXPECTED_PROCESS');
  };`);
  const before = fs.readFileSync(path.join(f.root, "data/products.json"));
  for (let i = 0; i < 2; i++) {
    const result = require("node:child_process").spawnSync(process.execPath,
      ["--require", preload, path.join(scripts, "classic-automation-complete-crawl.js"), "--batch"],
      { encoding: "utf8", timeout: 15000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout); assert.equal(report.status, "COMPLETE"); assert.equal(report.network, 0);
    assert.equal(report.finalization.status, i ? "COMPLETE_NOOP" : "FINALIZED");
    assert.deepEqual(fs.readFileSync(path.join(f.root, "data/products.json")), before);
  }
});
