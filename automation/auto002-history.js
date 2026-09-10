"use strict";

// Local AUTO-002 support only. No CLI, environment reads, subprocesses or network.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT, VERSION, compareMetrics, validateMetrics, validateBaseline,
  parseBaselineJSON, checkedPath, canonical, exactKeys, statusOf, exitCodeFor } = require("../scripts/daily-operations-report.js");

const HISTORY = "C:\\GlobalPLCParts-Automation\\auto002-history";
const DEFINITION = "GPLP-AUTO-002-stage1-metrics-v1";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SAFETY = Object.freeze({ automaticRepairs: "NONE", repositoryWrites: "NONE", productionChanges: "NONE",
  externalServices: "NONE", schedulerChanges: "NONE", sensitiveStores: "NONE", safetyStop: "NONE" });
const stamp = (s) => [s.dev, s.ino, s.mode, s.size, s.mtimeNs, s.ctimeNs].join(":");
const digest = (s) => crypto.createHash("sha256").update(s).digest("hex");
const fail = () => { throw new Error("HISTORY_UNAVAILABLE"); };
const iso = (s) => typeof s === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s;
const summary = (rows) => Object.fromEntries(["PASS", "ATTENTION", "BLOCKED"].map((s) => [s, rows.filter((r) => r.status === s).length]));

function localTimestamp(utc) {
  const d = new Date(utc);
  const offset = -d.getTimezoneOffset();
  const local = new Date(d.getTime() + offset * 60000).toISOString().slice(0, -1);
  return local + (offset < 0 ? "-" : "+") + String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0") + ":" + String(Math.abs(offset) % 60).padStart(2, "0");
}

function comparePrevious(metrics, baseline, previous) {
  const current = compareMetrics(metrics, baseline);
  const priorBase = previous ? compareMetrics(previous.metrics, baseline) : null;
  const versusPrior = previous ? compareMetrics(metrics, previous.metrics) : null;
  for (let i = 0; i < current.rows.length; i++) {
    const row = current.rows[i];
    row.persistence = "NOT COMPARABLE";
    if (!previous || !baseline) continue;
    const old = priorBase.rows[i];
    const delta = versusPrior.rows[i];
    row.previous = previous.metrics[row.metric];
    row.deltaPrevious = delta.deltaBaseline;
    row.previousUnroundedRateChanged = delta.unroundedRateChanged;
    const active = row.status !== "PASS";
    const wasActive = old.status !== "PASS";
    const reduction = row.group === "proxy" && delta.classification === "PROXY REDUCTION ONLY";
    if (reduction) row.persistence = "PROXY REDUCTION";
    else if (!active && wasActive) row.persistence = "RESOLVED";
    else if (active && !wasActive) row.persistence = "NEW";
    else if (active && wasActive) {
      const further = ["proxy", "advisory", "blocking"].includes(row.group)
        ? delta.status !== "PASS"
        : Math.abs(row.deltaBaseline) > Math.abs(old.deltaBaseline);
      row.persistence = further ? "REGRESSED FURTHER" : "PERSISTENT";
    } else row.persistence = delta.status !== "PASS" ? "NEW" : "UNCHANGED";
    row.status = statusOf(row.status, delta.status);
    if (delta.status !== "PASS") row.classification += " / CHANGE VS PREVIOUS: HUMAN REVIEW";
  }
  return { rows: current.rows, status: statusOf(current.status, ...current.rows.map((r) => r.status)) };
}

function operationsQueue(rows, git, historyIssue = false) {
  const specs = [
    ["repository", "Repository review", "Review Git eligibility, history gaps and local integrity/catalog inventory; propose scoped work for human approval.", (r) => r.group === "blocking" || r.group === "advisory" || ["products", "brands", "categories"].includes(r.metric)],
    ["scripts", "Script inventory review", "Review registry coverage and entry-point observations without executing scripts.", (r) => r.group === "scriptInventory"],
    ["images", "Image review", "Review aggregate image observations; proxy changes do not prove relevance or quality.", (r) => /Image|Reuse|Reused/.test(r.metric)],
    ["content", "Content review", "Review content inventory and description/date observations; do not edit content automatically.", (r) => /Blog|blog|Description/.test(r.metric)],
    ["seo", "SEO source-marker review", "Review source-marker changes; live SEO behavior remains unverified.", (r) => r.group === "seo"],
  ];
  return specs.map(([id, title, action, matches]) => {
    const affected = rows.filter((r) => r.status !== "PASS" && matches(r));
    const repositoryIssue = id === "repository" && (!git || git.state !== "CLEAN" || git.branch !== "MAIN" || historyIssue);
    return { id, title, priority: affected.some((r) => r.status === "BLOCKED") ? 1 : repositoryIssue ? 1 : 2,
      metricCount: affected.length, action, proposedOnly: true, needed: affected.length > 0 || repositoryIssue };
  }).filter((q) => q.needed).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

// Child transport is untrusted data: validate numbers/provenance, rebuild all prose.
function acceptTransport(source, nativeExitCode) {
  const input = parseBaselineJSON(source);
  if (!input || !["PASS", "ATTENTION", "BLOCKED", "CRITICAL STOP"].includes(input.status) || exitCodeFor(input.status) !== nativeExitCode) fail();
  if (input.status === "CRITICAL STOP" || (input.status === "BLOCKED" && exactKeys(input.metrics, []))) {
    return { task: "GPLP-AUTO-002", schema: VERSION.schema, collectorVersion: VERSION.collector,
      status: input.status, coverage: "PARTIAL OR INELIGIBLE", baseline: "NOT AVAILABLE", metrics: {}, comparison: [], findings: [], nativeExitCode };
  }
  if (input.task !== "GPLP-AUTO-002" || input.schema !== VERSION.schema || input.collectorVersion !== VERSION.collector ||
      input.repository !== ROOT || input.coverage !== "COMPLETE WITHIN STAGE 3" || !iso(input.timestampUTC) ||
      !exactKeys(input.git, ["state", "changedPaths", "branch", "head"]) ||
      !["MAIN", "OTHER", "DETACHED"].includes(input.git.branch) || typeof input.git.head !== "string" || !/^[a-f0-9]{40,64}$/.test(input.git.head) ||
      !Number.isSafeInteger(input.git.changedPaths) || input.git.changedPaths < 0 ||
      input.git.state !== (input.git.changedPaths ? "DIRTY" : "CLEAN")) fail();
  validateMetrics(input.metrics);
  let baseline = null;
  if (input.approvedBaseline) baseline = validateBaseline(JSON.stringify(input.approvedBaseline));
  if (!baseline && !["NOT AVAILABLE", "INCOMPATIBLE"].includes(input.baseline)) fail();
  const compared = compareMetrics(input.metrics, input.git.branch === "MAIN" && baseline ? baseline.metrics : null);
  const status = statusOf(compared.status, input.git.changedPaths || input.git.branch !== "MAIN" ? "ATTENTION" : "PASS");
  if (input.status !== status) fail();
  return { task: "GPLP-AUTO-002", schema: VERSION.schema, collectorVersion: VERSION.collector, repository: ROOT,
    timestampUTC: input.timestampUTC, git: input.git, metrics: input.metrics, approvedBaseline: baseline,
    baseline: baseline ? "APPROVED / ACTIVE INITIAL BASELINE" : input.baseline, status, nativeExitCode,
    coverage: "COMPLETE WITHIN STAGE 3", comparison: compared.rows, findings: [] };
}

function eligible(report) {
  return ["PASS", "ATTENTION"].includes(report.status) && report.nativeExitCode === 0 &&
    report.coverage === "COMPLETE WITHIN STAGE 3" && report.repository === ROOT &&
    report.git?.state === "CLEAN" && report.git.changedPaths === 0 && report.git.branch === "MAIN" &&
    !!report.approvedBaseline && report.comparison.length === 42;
}

function makeObservation(report, runId, previous) {
  if (!eligible(report) || !UUID.test(runId)) fail();
  return { taskId: "GPLP-AUTO-002", runId, timestampUTC: report.timestampUTC, timestampLocal: localTimestamp(report.timestampUTC),
    repository: ROOT, branch: "MAIN", head: report.git.head, gitState: "CLEAN", changedPaths: 0,
    schemaVersion: VERSION.schema, collectorVersion: VERSION.collector, metricDefinitionId: DEFINITION,
    baselineId: "GPLP-AUTO-002-baseline-v1", baselineRevision: 2, metrics: report.metrics,
    status: report.status, nativeExitCode: report.nativeExitCode, baselineComparison: summary(compareMetrics(report.metrics, report.approvedBaseline.metrics).rows),
    comparisonSummary: summary(report.comparison), previousRunId: previous?.runId ?? null, safety: { ...SAFETY } };
}

function validateObservation(source, runId, baseline) {
  const o = parseBaselineJSON(source);
  if (!exactKeys(o, ["taskId", "runId", "timestampUTC", "timestampLocal", "repository", "branch", "head", "gitState", "changedPaths",
    "schemaVersion", "collectorVersion", "metricDefinitionId", "baselineId", "baselineRevision", "metrics", "status", "nativeExitCode",
    "baselineComparison", "comparisonSummary", "previousRunId", "safety"]) ||
    o.taskId !== "GPLP-AUTO-002" || !UUID.test(o.runId) || o.runId !== runId || !iso(o.timestampUTC) ||
    typeof o.timestampLocal !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}[+-]\d\d:\d\d$/.test(o.timestampLocal) ||
    Date.parse(o.timestampLocal) !== Date.parse(o.timestampUTC) ||
    o.repository !== ROOT || o.branch !== "MAIN" || typeof o.head !== "string" || !/^[a-f0-9]{40,64}$/.test(o.head) || o.gitState !== "CLEAN" || o.changedPaths !== 0 ||
    o.schemaVersion !== 3 || o.collectorVersion !== 3 || o.metricDefinitionId !== DEFINITION ||
    o.baselineId !== "GPLP-AUTO-002-baseline-v1" || o.baselineRevision !== 2 ||
    !["PASS", "ATTENTION"].includes(o.status) || o.nativeExitCode !== 0 || canonical(o.safety) !== canonical(SAFETY) ||
    (o.previousRunId !== null && (!UUID.test(o.previousRunId) || o.previousRunId === runId))) fail();
  validateMetrics(o.metrics);
  const compared = compareMetrics(o.metrics, baseline.metrics);
  if (compared.status === "BLOCKED" || canonical(o.baselineComparison) !== canonical(summary(compared.rows))) fail();
  if (!exactKeys(o.comparisonSummary, ["PASS", "ATTENTION", "BLOCKED"]) ||
    Object.values(o.comparisonSummary).some((n) => !Number.isSafeInteger(n) || n < 0) ||
    Object.values(o.comparisonSummary).reduce((a, b) => a + b, 0) !== 42 || o.comparisonSummary.BLOCKED !== 0 ||
    o.comparisonSummary.ATTENTION < o.baselineComparison.ATTENTION ||
    o.status !== (o.comparisonSummary.ATTENTION ? "ATTENTION" : "PASS")) fail();
  return o;
}

class HistoryStore {
  // Alternate root is an import-only synthetic test seam. Production has no path arguments.
  constructor(root = HISTORY) {
    if (typeof root !== "string" || !path.isAbsolute(root) || /^[/\\]{2}/.test(root) || path.resolve(root) !== root) fail();
    this.root = root; this.reads = []; this.directories = []; this.started = Date.now();
  }
  target(relative) { return checkedPath(this.root, relative); }
  budget() { if (Date.now() - this.started > 15000) fail(); }
  directory() {
    this.budget();
    this.target("probe");
    const s = fs.lstatSync(this.root, { bigint: true });
    if (!s.isDirectory() || s.isSymbolicLink()) fail();
    return stamp(s);
  }
  initialize() {
    this.started = Date.now(); // History budget starts after the bounded child collection.
    // Never create the parent or alter ACLs. An absent fixed leaf can be created once.
    this.target("probe");
    if (!fs.existsSync(this.root)) {
      const parent = fs.lstatSync(path.dirname(this.root));
      if (!parent.isDirectory() || parent.isSymbolicLink()) fail();
      fs.mkdirSync(this.root);
    }
    this.initial = this.directory();
  }
  read(relative) {
    this.budget();
    const file = this.target(relative);
    const before = fs.lstatSync(file, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size > 65536n) fail();
    const fd = fs.openSync(file, "r");
    let bytes;
    try {
      if (stamp(fs.fstatSync(fd, { bigint: true })) !== stamp(before)) fail();
      bytes = fs.readFileSync(fd);
      if (stamp(fs.fstatSync(fd, { bigint: true })) !== stamp(before)) fail();
    } finally { fs.closeSync(fd); }
    if (stamp(fs.lstatSync(this.target(relative), { bigint: true })) !== stamp(before)) fail();
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), fingerprint: stamp(before) + digest(bytes) };
  }
  select(beforeUTC, baseline) {
    let previous = null;
    let ambiguous = false;
    let skipped = 0;
    const entries = fs.readdirSync(this.root, { withFileTypes: true });
    if (entries.length > 10000) fail();
    for (const entry of entries) {
      this.budget();
      if (entry.isSymbolicLink()) fail();
      if (!UUID.test(entry.name) || !entry.isDirectory()) { skipped++; continue; }
      this.directories.push({ relative: entry.name, fingerprint: stamp(fs.lstatSync(this.target(entry.name), { bigint: true })) });
      const relative = entry.name + "/observation.json";
      const file = this.target(relative);
      if (!fs.existsSync(file)) { skipped++; continue; }
      // Unsafe/read-changing files fail the whole selection. Invalid data is skipped and counted.
      const read = this.read(relative);
      this.reads.push({ relative, fingerprint: read.fingerprint });
      let candidate;
      try { candidate = validateObservation(read.text, entry.name, baseline); }
      catch { skipped++; continue; }
      if (candidate.timestampUTC >= beforeUTC) { skipped++; continue; }
      if (previous && candidate.timestampUTC === previous.timestampUTC) ambiguous = true;
      if (!previous || candidate.timestampUTC > previous.timestampUTC) { previous = candidate; ambiguous = false; }
    }
    if (ambiguous) fail();
    this.verify();
    return { previous, skipped };
  }
  verify() {
    if (this.directory() !== this.initial) fail();
    for (const entry of this.directories) if (stamp(fs.lstatSync(this.target(entry.relative), { bigint: true })) !== entry.fingerprint) fail();
    for (const entry of this.reads) if (this.read(entry.relative).fingerprint !== entry.fingerprint) fail();
  }
  publish(runId, output, observation) {
    if (!UUID.test(runId) || typeof output !== "string" || Buffer.byteLength(output) > 65536) fail();
    const json = observation ? JSON.stringify(observation) + "\n" : null;
    if (json && Buffer.byteLength(json) > 65536) fail();
    this.verify();
    // Exclusive per-run namespace prevents concurrent writers sharing a rename destination.
    // No recursive mkdir, no retry, no overwrite, no deletion (even of incomplete temp files).
    fs.mkdirSync(this.target(runId));
    const write = (name, text) => {
      const temp = this.target(runId + "/" + name + ".tmp");
      const destination = this.target(runId + "/" + name);
      const fd = fs.openSync(temp, "wx", 0o600);
      try { fs.writeFileSync(fd, text, "utf8"); fs.fsyncSync(fd); }
      finally { fs.closeSync(fd); }
      this.target(runId + "/" + name + ".tmp");
      if (fs.existsSync(destination)) fail();
      fs.renameSync(temp, destination);
    };
    write("report.txt", output);
    if (json) write("observation.json", json); // Last rename is the eligibility commit marker.
  }
}

module.exports = { HISTORY, SAFETY, HistoryStore, comparePrevious, operationsQueue, acceptTransport,
  eligible, makeObservation, validateObservation, localTimestamp };
