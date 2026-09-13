"use strict";
// Local reports only. No acquisition requests, scheduler mutations or elevation.
const fs = require("node:fs"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const c = require("./classic-automation-complete-crawl");
const REPORT_DIR = "reports/classic-complete";
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const errorCode = e => /^[A-Z_0-9]+$/.test(e.code || "") ? e.code : "LOCAL_VALIDATION_FAILED";
function schedulerSnapshot() {
  if (process.platform !== "win32") return { status: "UNAVAILABLE", reason: "NOT_WINDOWS" };
  try {
    const command = "$ErrorActionPreference='Stop'; $n='GPLP-CLASSIC-COMPLETE-CRAWL'; $t=Get-ScheduledTask -TaskName $n -TaskPath '\\'; $i=Get-ScheduledTaskInfo -TaskName $n -TaskPath '\\'; [pscustomobject]@{enabled=$t.Settings.Enabled;state=[string]$t.State;lastResult=$i.LastTaskResult;nextRun=$i.NextRunTime.ToString('o');interval=$t.Triggers.Repetition.Interval;account=$t.Principal.UserId;logon=[string]$t.Principal.LogonType;runLevel=[string]$t.Principal.RunLevel}|ConvertTo-Json -Compress";
    return { status: "AVAILABLE", ...JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command],
      { encoding: "utf8", timeout: 10000, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] })) };
  } catch { return { status: "UNAVAILABLE", reason: "LOCAL_SCHEDULER_QUERY_FAILED" }; }
}
function codeVersion(root) {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", timeout: 3000,
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch { return null; }
}
function writeText(file, text) {
  const temp = `${file}.${require("node:crypto").randomUUID()}.tmp`;
  const fd = fs.openSync(temp, "wx", 0o600);
  try { fs.writeFileSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  try { fs.renameSync(temp, file); } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function integrity(root, state, products) {
  c.validateState(state); c.validateCatalog(products);
  const baseline = c.validateCatalog(read(path.join(root, "data/classic-complete-sweep-baseline.json")));
  const current = new Map(products.map(p => [c.key(p), p]));
  const preserved = require("./product-image-files").preservationCheck(root);
  if (baseline.length !== state.initialCatalogCount || c.digest(JSON.stringify(baseline)) !== state.initialCatalogHash ||
      baseline.some(p => !preserved(current.get(c.key(p)), p))) c.fail("ORIGINAL_PRODUCT_CHANGED");
  const originals = new Map(baseline.map(p => [c.key(p), p]));
  let historicalReferences = 0;
  for (const p of products.filter(p => p.source === "ClassicAutomation")) {
    const url = new URL(p.sourceUrl);
    if (url.origin !== "https://www.classicautomation.com" || url.username || url.password) c.fail("FINAL_SOURCE_SCOPE");
    const strict = !url.search && !url.hash && /^\/(?:[a-z0-9._~-]+|parts\/[a-z0-9-]+\/[a-z0-9._~-]+)$/i.test(url.pathname);
    if (!strict) {
      // Preserve exact baseline public references, never grant new acquisitions this exception.
      const historical = p.acquisition?.workflow !== "classic-complete" && originals.has(c.key(p)) && preserved(p, originals.get(c.key(p)));
      const category = !url.search && !url.hash && c.BRANDS.some(b => url.pathname === `/${b.category}/`);
      const search = url.pathname === "/catalogsearch/result/" && [...url.searchParams.keys()].join() === "q" &&
        url.searchParams.get("q") === `${p.brand} ${p.model}` && ["", "#contentarea"].includes(url.hash);
      if (!historical || !(category || search)) c.fail("FINAL_SOURCE_SCOPE");
      historicalReferences++;
    }
    if (p.acquisition?.workflow === "classic-complete" && (!p.acquisition.sourceId || !p.acquisition.crawlId)) c.fail("FINAL_PRODUCT_IDENTITY");
  }
  return { result: "PASS", duplicateIdentities: 0, duplicateSlugs: 0, baselinePreserved: baseline.length, historicalReferences };
}
function validateCompletion(state) {
  c.validateState(state);
  if (state.status !== "FULLY_COMPLETE") c.fail("FINAL_NOT_COMPLETE");
  for (const b of state.brands) {
    if (!b.complete || b.pending || b.lastErrorCategory || b.stableSweeps !== 2 || b.nonConfirming ||
        b.startTotal !== b.totalCount || b.lastCommittedPage < Math.max(1, b.totalPages) ||
        b.previousSweep.total !== b.totalCount || b.previousSweep.startTotal !== b.totalCount ||
        b.previousSweep.seen.length !== b.totalCount || b.previousSweep.added !== 0 ||
        !Number.isFinite(Date.parse(b.completionEvidence?.confirmedAt)) ||
        b.completionEvidence.confirmedAt !== b.previousSweep.completedAt ||
        b.completionEvidence.previousGeneration !== b.generation - 1) c.fail("FINAL_EVIDENCE_INVALID");
  }
}
function finalize({ root = c.ROOT, scheduler = schedulerSnapshot(), version = codeVersion(root) } = {}) {
  const unlock = c.acquire(path.join(root, "data/classic-complete-catalog.lock"));
  if (!unlock) return { status: "DEFERRED", reason: "CATALOG_LOCKED" };
  try {
    const state = c.validateState(read(path.join(root, "data", c.STATE_NAME)));
    if (state.status !== "FULLY_COMPLETE") return { status: "NOT_COMPLETE" };
    validateCompletion(state);
    const products = read(path.join(root, "data/products.json"));
    const checks = integrity(root, state, products);
    const catalogHash = c.digest(JSON.stringify(products)), stateHash = c.digest(JSON.stringify(state));
    const directory = path.join(root, REPORT_DIR, state.crawlId);
    if (fs.existsSync(directory)) {
      const report = read(path.join(directory, "completion.json"));
      if (report.catalogHash !== catalogHash || report.stateHash !== stateHash || report.crawlId !== state.crawlId ||
          report.integrity?.result !== "PASS" || report.finalState !== "FULLY_COMPLETE" ||
          c.digest(JSON.stringify(read(path.join(directory, "final-state.json")))) !== stateHash ||
          c.digest(fs.readFileSync(path.join(directory, "summary.md"))) !== report.summaryHash) c.fail("FINAL_REPORT_MISMATCH");
      return { status: "COMPLETE_NOOP", directory, network: 0, catalogMutation: 0 };
    }
    const classic = products.filter(p => p.source === "ClassicAutomation");
    const added = products.filter(p => p.acquisition?.workflow === "classic-complete").length;
    const report = { schemaVersion: 1, completedAt: new Date().toISOString(), crawlId: state.crawlId,
      catalogProducts: products.length, classicAutomationProducts: classic.length, completeWorkflowProducts: added,
      earlierWorkflowProductsPreserved: products.length - added, finalState: state.status, integrity: checks,
      catalogHash, stateHash, scheduler, codeVersion: version, stopStrategy: "ENABLED_LOCAL_COMPLETE_NOOP_NO_NETWORK",
      brands: state.brands.map((b, i) => ({ name: c.BRANDS[i].brand, category: c.BRANDS[i].category,
        sourceTotal: b.totalCount, generation: b.generation, stableSweeps: b.stableSweeps,
        completedAt: b.completionEvidence.confirmedAt, cumulativeFailures: b.cumulativeFailures,
        finalSweepRetries: b.failedRetryable, unresolvedError: b.lastErrorCategory })),
      cumulativeFailures: state.brands.reduce((sum, b) => sum + b.cumulativeFailures, 0) };
    const summary = `# Classic Automation acquisition complete\n\nCompleted: ${report.completedAt}\nCrawl: ${state.crawlId}\n\n` +
      `All 17 targets passed the existing two-sweep policy. Catalog: ${products.length}; ClassicAutomation: ${classic.length}; workflow additions: ${added}.\n` +
      `Integrity: PASS; duplicate identities: 0; duplicate slugs: 0. Historical records preserved.\n` +
      `Future invocations exit successfully without acquisition network requests or catalog writes. Task is retained at limited privileges.\n\n` +
      report.brands.map(b => `- ${b.name}: total ${b.sourceTotal}, generation ${b.generation}, stable sweeps ${b.stableSweeps}, completed ${b.completedAt}`).join("\n") + "\n";
    report.summaryHash = c.digest(summary);
    fs.mkdirSync(path.dirname(directory), { recursive: true });
    const staging = `${directory}.${require("node:crypto").randomUUID()}.tmp`;
    fs.mkdirSync(staging);
    c.atomic(path.join(staging, "final-state.json"), state, validateCompletion);
    writeText(path.join(staging, "summary.md"), summary);
    c.atomic(path.join(staging, "completion.json"), report, r => { if (r.integrity.result !== "PASS") c.fail("FINAL_REPORT_INVALID"); });
    // Publish all three durable artifacts together. Interrupted staging is never a completion marker.
    fs.renameSync(staging, directory);
    return { status: "FINALIZED", directory, network: 0, catalogMutation: 0 };
  } finally { unlock(); }
}
function progress({ root = c.ROOT, scheduler = schedulerSnapshot(), latest } = {}) {
  const timestamp = new Date().toISOString();
  try {
    const state = c.validateState(read(path.join(root, "data", c.STATE_NAME)));
    const products = c.validateCatalog(read(path.join(root, "data/products.json")));
    latest ||= read(path.join(root, "data/classic-complete-last-run.json"));
    const b = state.brands.find(b => !b.complete);
    const locked = fs.existsSync(path.join(root, "data/classic-complete-catalog.lock"));
    const blocked = !locked && (state.brands.some(b => b.lastErrorCategory) || latest.status === "BLOCKED");
    return { timestamp, overall: blocked ? "BLOCKED" : state.status === "FULLY_COMPLETE" ? "FULLY_COMPLETE" : "RUNNING",
      catalog: products.length, classicAutomation: products.filter(p => p.source === "ClassicAutomation").length,
      current: b ? { brand: c.BRANDS.find(r => r.slug === b.brand).brand, generation: b.generation,
        page: b.currentPage, totalPages: b.totalPages, lastCommittedPage: b.lastCommittedPage,
        pending: b.pending ? b.pending.items.length - b.pending.cursor : 0, stableSweeps: b.stableSweeps,
        cumulativeFailures: b.cumulativeFailures, lastError: b.lastErrorCategory } : null,
      completed: state.brands.filter(b => b.complete).map(b => c.BRANDS.find(r => r.slug === b.brand).brand),
      remaining: state.brands.filter(b => !b.complete).map(b => c.BRANDS.find(r => r.slug === b.brand).brand),
      completedBrands: state.brands.filter(b => b.complete).length, targets: 17, latest,
      integrity: { duplicateIdentities: 0, duplicateSlugs: 0 }, lockActive: locked,
      snapshot: locked ? "LIVE_NON_TRANSACTIONAL" : "LOCAL_SNAPSHOT", scheduler };
  } catch (e) { return { timestamp, overall: "BLOCKED", error: errorCode(e), scheduler }; }
}
function renderStatus(s) {
  const run = s.latest || {}, task = s.scheduler || {};
  return `# CLASSIC AUTOMATION CRAWL STATUS\n\nAs of: ${s.timestamp}\nOverall: ${s.overall}\n` +
    `Catalog: ${s.catalog ?? "unknown"}; ClassicAutomation: ${s.classicAutomation ?? "unknown"}\n` +
    `Current target: ${s.current ? `${s.current.brand}; generation ${s.current.generation}; page ${s.current.page}/${s.current.totalPages ?? "unknown"}; last committed ${s.current.lastCommittedPage}; pending ${s.current.pending}; stable sweeps ${s.current.stableSweeps}` : "none"}\n` +
    `Completed: ${s.completedBrands ?? "unknown"}/17 (${s.completed?.join(", ") || "none"})\nRemaining: ${s.remaining?.join(", ") || "none"}\n` +
    `Lock active: ${s.lockActive ?? "unknown"}; snapshot: ${s.snapshot || "unavailable"}\n\n` +
    `Latest run: ${run.timestamp || "unknown"}; ${run.status || "unknown"}\n` +
    `Added: ${run.added ?? 0}; skipped: ${run.skippedExisting ?? 0}; processed: ${run.processed ?? 0}; pages committed: ${run.pagesCommitted ?? 0}; elapsed: ${run.elapsedSeconds ?? "unknown"} seconds\n` +
    `Latest run error: ${run.error || "none"}; cumulative target failures: ${s.current?.cumulativeFailures ?? 0}\n\n` +
    `Integrity: duplicate identities ${s.integrity?.duplicateIdentities ?? "unknown"}; duplicate slugs ${s.integrity?.duplicateSlugs ?? "unknown"}\n\n` +
    `Scheduler: ${task.status}; ${task.enabled === undefined ? "unknown" : task.enabled ? "Enabled" : "Disabled"}; ${task.state || "unknown"}\n` +
    `Last result: ${task.lastResult ?? "unknown"}; next run: ${task.nextRun || "unknown"}; cadence: ${task.interval || "unknown"}\n` +
    `Scheduler query: ${task.reason || "OK"}\n\nError: ${s.error || s.current?.lastError || "none"}\n`;
}
function writeProgress(options = {}) {
  const s = progress(options), directory = path.join(options.root || c.ROOT, REPORT_DIR);
  fs.mkdirSync(directory, { recursive: true });
  c.atomic(path.join(directory, "status.json"), s, value => { if (!value.overall) c.fail("STATUS_INVALID"); });
  writeText(path.join(directory, "status.md"), renderStatus(s));
  return s;
}
function afterBatch(result, { root = c.ROOT, scheduler = schedulerSnapshot() } = {}) {
  const output = { timestamp: new Date().toISOString(), ...result };
  if (["COMPLETE", "FULLY_COMPLETE"].includes(result.status)) {
    output.finalization = finalize({ root, scheduler });
    if (output.finalization.status === "DEFERRED") output.status = "LOCKED";
    else if (output.finalization.status === "NOT_COMPLETE") c.fail("FINAL_STATE_CHANGED");
  }
  writeProgress({ root, scheduler, latest: output });
  return output;
}
module.exports = { REPORT_DIR, schedulerSnapshot, integrity, validateCompletion, finalize, progress, writeProgress, renderStatus, errorCode, afterBatch };
if (require.main === module) {
  if (process.argv.slice(2).join() !== "--status") { console.error("Use --status (local report refresh only)"); process.exitCode = 2; }
  else { const s = writeProgress(); console.log(renderStatus(s)); process.exitCode = s.overall === "BLOCKED" ? 2 : 0; }
}
