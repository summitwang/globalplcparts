"use strict";

const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const { ROOT, render, checkedPath, exitCodeFor } = require("../scripts/daily-operations-report.js");
const { HistoryStore, acceptTransport, eligible, comparePrevious, operationsQueue, makeObservation } = require("./auto002-history.js");

const NODE = "C:\\Program Files\\nodejs\\node.exe";
const COLLECTOR = ROOT + "\\scripts\\daily-operations-report.js";
const CHILD_OPTIONS = Object.freeze({ cwd: ROOT, encoding: "utf8", timeout: 90000, maxBuffer: 65536,
  windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"], env: Object.freeze({}) });

function executeCollector() {
  // Ancestor checks before launching fixed Node and the only approved child script.
  checkedPath("C:\\Program Files\\nodejs", "node.exe");
  checkedPath(ROOT, "scripts/daily-operations-report.js");
  return spawnSync(NODE, [COLLECTOR, "--json"], CHILD_OPTIONS);
}

function outputFor(report, queue, history, skipped, nativeExitCode) {
  const lines = [render({ ...report, reviewRequired: queue.length > 0 }).trimEnd(), "Local prioritized operations queue (proposals only):"];
  for (const q of queue) lines.push(`P${q.priority} | ${q.title} | affected metrics: ${q.metricCount} | ${q.action}`);
  if (!queue.length) lines.push("No new review actions. Approved unchanged observations remain visible.");
  lines.push(`History: ${history}`, `History entries skipped/unavailable: ${skipped}`,
    `Native collector exit code: ${nativeExitCode}`, "Automatic baseline advancement: NONE", "Retries / cleanup / rotation: NONE");
  return lines.join("\n") + "\n";
}

function run({ execute = executeCollector, store = new HistoryStore(), runId = crypto.randomUUID() } = {}) {
  let report;
  let nativeExitCode = null;
  try {
    const child = execute();
    nativeExitCode = Number.isInteger(child.status) && child.status >= 0 && child.status <= 0xffffffff ? child.status : null;
    if (child.error || child.signal || ![0, 2, 4].includes(nativeExitCode)) throw new Error("CHILD_FAILED");
    report = acceptTransport(child.stdout, nativeExitCode);
  } catch {
    return { exitCode: nativeExitCode === 4 ? 4 : 2, output: `GPLP-AUTO-002 runner: ${nativeExitCode === 4 ? "CRITICAL STOP" : "BLOCKED"}; collector execution or transport verification failed. Raw output suppressed. No history written; no retry.\n` +
      `Native collector exit code: ${nativeExitCode ?? "NOT AVAILABLE"}\n` };
  }
  let previous = null;
  let skipped = 0;
  const currentOnly = JSON.parse(JSON.stringify(report));
  try {
    store.initialize();
    if (eligible(report)) {
      const selection = store.select(report.timestampUTC, report.approvedBaseline);
      previous = selection.previous;
      skipped = selection.skipped;
      const comparison = comparePrevious(report.metrics, report.approvedBaseline.metrics, previous);
      report.comparison = comparison.rows;
      report.status = comparison.status;
      report.previousLabel = previous ? `${previous.runId} / ${previous.timestampUTC} / schema 3 collector 3` : "NOT AVAILABLE — NO EARLIER ELIGIBLE OBSERVATION";
    } else report.previousLabel = "NOT COMPARABLE — CURRENT RUN INELIGIBLE";
    const queue = operationsQueue(report.comparison, report.git, skipped > 0);
    const observation = eligible(report) ? makeObservation(report, runId, previous) : null;
    // Saved text does not claim successful publication before the final rename.
    const saved = outputFor(report, queue, "REPORT PREPARED; observation.json IS THE ELIGIBILITY COMMIT MARKER", skipped, nativeExitCode);
    store.publish(runId, saved, observation);
    return { exitCode: exitCodeFor(report.status), report,
      output: outputFor(report, queue, observation ? "WRITTEN / IMMUTABLE OBSERVATION" : "REPORT ONLY / INELIGIBLE AS PREVIOUS", skipped, nativeExitCode) };
  } catch {
    // Preserve the verified current observation; discard uncertain history comparison.
    report = currentOnly;
    report.previousLabel = "NOT AVAILABLE — HISTORY VALIDATION OR PERSISTENCE FAILED";
    for (const row of report.comparison) {
      row.previous = null; row.deltaPrevious = null; row.persistence = "NOT COMPARABLE";
    }
    return { exitCode: nativeExitCode === 4 ? 4 : 2, report,
      output: outputFor(report, operationsQueue(report.comparison, report.git, true), "FAILED; CURRENT RESULT RETAINED; NO RETRY OR REPAIR", skipped, nativeExitCode) };
  }
}

if (require.main === module) {
  const result = process.argv.length === 2 ? run() : { exitCode: 2, output: "GPLP-AUTO-002 runner: BLOCKED; arguments are prohibited.\n" };
  process.stdout.write(result.output);
  process.exitCode = result.exitCode;
}

module.exports = { run, outputFor, NODE, COLLECTOR, CHILD_OPTIONS };
