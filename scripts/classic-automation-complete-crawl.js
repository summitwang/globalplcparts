"use strict";
// Standalone acquisition only. Never imports historical runners or application code.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const STATE_NAME = "classic-complete-crawl-state.json";
const PAGE_SIZE = 12;
const BRANDS = [
  ["Allen Bradley", "allen-bradley"], ["ABB", "abb"], ["Siemens", "siemens"],
  ["Schneider", "schneider"], ["Omron", "omron"],
  ["Mitsubishi", "mitsubishi"], ["Honeywell", "honeywell"], ["Yokogawa", "yokogawa"],
  ["Emerson", "emerson"], ["GE / General Electric", "ge-fanuc", "ge-general-electric"], ["Bently Nevada", "bently-nevada"],
  ["Foxboro", "foxboro"], ["HIMA", "hima"], ["Bachmann", "bachmann"],
  ["Rexroth", "rexroth"], ["ProSoft", "prosoft"], ["Woodward", "woodward"],
].map(([brand, slug, source = slug]) => ({ brand, slug, category: `parts/${source}` }));
const fail = code => { throw Object.assign(new Error(code), { code }); };
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
const norm = value => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
// Keep the historical state/slug namespace while treating the approved GE names
// as one dedupe identity. Existing catalog objects are never renamed or rewritten.
const brandKey = brand => {
  const normalized = norm(brand);
  return ["ge", "ge fanuc", "ge-fanuc", "general electric", "ge / general electric", "ge - general electric"].includes(normalized)
    ? "ge-general-electric" : normalized;
};
const key = p => `${brandKey(p.brand)}|${norm(p.model)}`;
const slugify = text => norm(text).replace(/&/g, "and").replace(/\+/g, "plus").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const json = file => JSON.parse(fs.readFileSync(file, "utf8"));
const integer = n => Number.isSafeInteger(n) && n >= 0;
function validateCatalog(rows) {
  if (!Array.isArray(rows) || !rows.length) fail("CATALOG_EMPTY_OR_INVALID");
  const keys = new Set(), slugs = new Set();
  for (const p of rows) {
    if (![p.brand, p.model, p.slug, p.category].every(x => typeof x === "string" && x.trim())) fail("CATALOG_FIELDS");
    if (keys.has(key(p)) || slugs.has(norm(p.slug))) fail("CATALOG_DUPLICATE");
    keys.add(key(p)); slugs.add(norm(p.slug));
  }
  return rows;
}
function atomic(file, value, validate, beforeRename = () => {}) {
  const encoded = JSON.stringify(value, null, 2) + "\n";
  validate(JSON.parse(encoded));
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temp, "wx", 0o600);
    fs.writeFileSync(fd, encoded, "utf8"); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    validate(json(temp));
    beforeRename();
    // Same-directory rename replaces atomically; never unlink the destination first.
    fs.renameSync(temp, file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
function acquire(file, isAlive = pid => {
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code !== "ESRCH"; }
}) {
  let fd;
  try { fd = fs.openSync(file, "wx", 0o600); }
  catch (e) {
    if (e.code !== "EEXIST") throw e;
    // Reclaim only a provably dead owner. A live/reused PID, malformed owner,
    // access denied or interrupted recovery fails closed, without process kills.
    let recovery;
    try { recovery = fs.openSync(`${file}.recovery`, "wx", 0o600); }
    catch { return null; }
    try {
      if (!fs.existsSync(file)) return acquire(file, isAlive);
      let owner;
      try { owner = json(file); } catch { return null; }
      if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0 || isAlive(owner.pid)) return null;
      fs.unlinkSync(file);
      return acquire(file, isAlive);
    } finally { fs.closeSync(recovery); fs.unlinkSync(`${file}.recovery`); }
  }
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })); fs.fsyncSync(fd); }
  catch (e) { fs.closeSync(fd); fs.unlinkSync(file); throw e; }
  return () => { fs.closeSync(fd); fs.unlinkSync(file); };
}
function validateLegacyState(s) {
  if (!s || s.schemaVersion !== 1 || !/^[a-f0-9-]{36}$/.test(s.crawlId) || s.pageSize !== PAGE_SIZE ||
      !integer(s.initialCatalogCount) || s.initialCatalogCount < 1 || !/^[a-f0-9]{64}$/.test(s.initialCatalogHash) ||
      !["INCOMPLETE", "FULLY_COMPLETE"].includes(s.status) || !Array.isArray(s.brands) || s.brands.length !== BRANDS.length) fail("STATE_INVALID");
  for (const [i, b] of s.brands.entries()) {
    if (b.brand !== BRANDS[i].slug || !integer(b.lastCommittedPage) || b.currentPage !== b.lastCommittedPage + 1 ||
        !Array.isArray(b.seen) || new Set(b.seen).size !== b.seen.length || !b.seen.every(x => typeof x === "string" && x) ||
        !Array.isArray(b.pageFingerprints) || b.pageFingerprints.length !== b.lastCommittedPage ||
        ![b.successful, b.skippedExisting, b.duplicatesPrevented, b.failedRetryable, b.consecutiveConfirmedEmptyPages].every(integer) ||
        typeof b.complete !== "boolean" || (b.totalCount !== null && !integer(b.totalCount)) ||
        (b.totalPages !== null && !integer(b.totalPages))) fail("STATE_INVALID");
    if (b.totalCount !== null && b.totalPages !== Math.ceil(b.totalCount / PAGE_SIZE)) fail("STATE_TOTALS");
    if (b.reconciliation && (b.pending || b.complete || !integer(b.reconciliation.total) ||
        b.reconciliation.pages !== Math.ceil(b.reconciliation.total / PAGE_SIZE) ||
        !Number.isSafeInteger(b.reconciliation.nextCheckPage) || b.reconciliation.nextCheckPage < 1 ||
        b.reconciliation.nextCheckPage > b.lastCommittedPage + 1)) fail("STATE_RECONCILIATION");
    if (b.seen.length + (b.pending?.cursor || 0) !== b.successful + b.skippedExisting || b.duplicatesPrevented !== b.skippedExisting) fail("STATE_COUNTERS");
    if (b.pending) {
      const p = b.pending;
      if (p.page !== b.currentPage || !Array.isArray(p.items) || !integer(p.cursor) || p.cursor > p.items.length ||
          p.total !== b.totalCount || !Array.isArray(p.ids) || p.ids.length !== p.items.length ||
          p.fingerprint !== digest(JSON.stringify(p.ids)) || new Set(p.ids).size !== p.ids.length) fail("STATE_PENDING");
      for (const [j, item] of p.items.entries()) if (item.id !== p.ids[j] || !item.model || !item.sourceUrl) fail("STATE_PENDING_ITEM");
      if (p.ids.some(id => b.seen.includes(id))) fail("STATE_PENDING_REPEATED");
    }
    if (b.complete && (b.pending || b.seen.length !== b.totalCount || b.lastCommittedPage !== Math.max(1, b.totalPages) ||
        !b.finalEvidence || b.finalEvidence.total !== b.totalCount || !b.finalEvidence.confirmedAt ||
        b.finalEvidence.fingerprint !== b.pageFingerprints.at(-1))) fail("STATE_FALSE_COMPLETE");
  }
  if ((s.status === "FULLY_COMPLETE") !== s.brands.every(b => b.complete)) fail("STATE_OVERALL_COMPLETE");
  return s;
}
function newBrand(rule, generation = 1) {
  return { brand: rule.slug, generation, currentPage: 1, lastCommittedPage: 0,
    startTotal: null, totalCount: null, totalPages: null, seen: [], pending: null,
    pageFingerprints: [], added: 0, skippedExisting: 0, failedRetryable: 0,
    cumulativeAdded: 0, cumulativeSkipped: 0, cumulativeFailures: 0,
    nonConfirming: false, stableSweeps: 0, previousSweep: null, complete: false,
    completionEvidence: null, lastSuccessfulAt: null, lastErrorCategory: null };
}
function initialState(products) {
  return { schemaVersion: 2, crawlId: crypto.randomUUID(), status: "INCOMPLETE", pageSize: PAGE_SIZE,
    initialCatalogCount: products.length, initialCatalogHash: digest(JSON.stringify(products)),
    brands: BRANDS.map(rule => newBrand(rule)) };
}
const setHash = ids => digest(JSON.stringify([...ids].sort()));
const validIds = ids => Array.isArray(ids) && ids.every(id => typeof id === "string" && id && norm(id) === id) && new Set(ids).size === ids.length;
function validateState(s) {
  if (!s || s.schemaVersion !== 2 || !/^[a-f0-9-]{36}$/.test(s.crawlId) || s.pageSize !== PAGE_SIZE ||
      !integer(s.initialCatalogCount) || s.initialCatalogCount < 1 || !/^[a-f0-9]{64}$/.test(s.initialCatalogHash) ||
      !["INCOMPLETE", "FULLY_COMPLETE"].includes(s.status) || !Array.isArray(s.brands) || s.brands.length !== 17) fail("STATE_INVALID");
  for (const [i, b] of s.brands.entries()) {
    if (b.brand !== BRANDS[i].slug || !integer(b.generation) || b.generation < 1 ||
        !integer(b.lastCommittedPage) || b.currentPage !== b.lastCommittedPage + 1 || !validIds(b.seen) ||
        ![b.added, b.skippedExisting, b.failedRetryable, b.cumulativeAdded, b.cumulativeSkipped, b.cumulativeFailures, b.stableSweeps].every(integer) ||
        b.stableSweeps > 2 || typeof b.complete !== "boolean" || typeof b.nonConfirming !== "boolean" ||
        !Array.isArray(b.pageFingerprints) || b.pageFingerprints.length !== b.lastCommittedPage ||
        ![b.startTotal, b.totalCount, b.totalPages].every(n => n === null || integer(n))) fail("STATE_BRAND_INVALID");
    if (b.pending) {
      const p = b.pending;
      if (p.page !== b.currentPage || !Array.isArray(p.items) || !integer(p.cursor) || p.cursor > p.items.length ||
          !Array.isArray(p.ids) || p.ids.length !== p.items.length || p.fingerprint !== digest(JSON.stringify(p.ids)) ||
          !integer(p.total) || !integer(p.pages) || typeof p.consistent !== "boolean") fail("STATE_PENDING");
      for (const [j, item] of p.items.entries()) if (norm(item.id) !== p.ids[j] || !item.model || !item.sourceUrl) fail("STATE_PENDING_ITEM");
    }
    if (b.previousSweep) {
      const p = b.previousSweep;
      if (!integer(p.generation) || !validIds(p.seen) || p.hash !== setHash(p.seen) || !integer(p.total) ||
          typeof p.confirming !== "boolean" || !p.completedAt || !integer(p.added) || !integer(p.skippedExisting)) fail("STATE_PREVIOUS_SWEEP");
    }
    if (b.stableSweeps > 0 && !b.previousSweep?.confirming) fail("STATE_STABILITY");
    if (b.complete && (b.pending || b.stableSweeps !== 2 || b.nonConfirming ||
        !b.previousSweep?.confirming || b.previousSweep.generation !== b.generation ||
        b.seen.length !== b.totalCount || b.previousSweep.hash !== setHash(b.seen) ||
        b.completionEvidence?.previousHash !== setHash(b.seen) || b.completionEvidence?.currentHash !== setHash(b.seen) ||
        b.completionEvidence?.previousTotal !== b.totalCount || b.added !== 0)) fail("STATE_FALSE_COMPLETE");
  }
  if ((s.status === "FULLY_COMPLETE") !== s.brands.every(b => b.complete)) fail("STATE_OVERALL_COMPLETE");
  return s;
}
function pageResult(r, page) {
  if (!r || !integer(r.total) || !Number.isSafeInteger(r.page) || r.page < 1 ||
      !integer(r.pageSize) || !integer(r.pages) || !Array.isArray(r.items)) fail("LISTING_METADATA");
  const ids = r.items.map(x => norm(x.id));
  if (ids.some(id => !id)) fail("LISTING_IDENTITIES");
  const expected = Math.min(PAGE_SIZE, Math.max(0, r.total - (page - 1) * PAGE_SIZE));
  const consistent = r.page === page && r.pageSize === PAGE_SIZE &&
    (r.pages === Math.ceil(r.total / PAGE_SIZE) || (r.total === 0 && r.pages === 1)) &&
    r.items.length === expected && new Set(ids).size === ids.length;
  return { ids, fingerprint: digest(JSON.stringify(ids)), consistent };
}
function finishSweep(b) {
  const previous = b.previousSweep;
  const confirming = !b.nonConfirming && b.pending === null && b.startTotal === b.totalCount &&
    b.seen.length === b.totalCount && b.lastCommittedPage >= Math.max(1, b.totalPages);
  const seen = [...b.seen].sort();
  const hash = setHash(seen);
  const previousIds = new Set(previous?.seen || []);
  const sameCoverage = previous?.confirming && previous.total === b.totalCount &&
    previous.hash === hash && previous.seen.length === seen.length &&
    previous.seen.every((id, i) => id === seen[i]);
  const summary = { generation: b.generation, total: b.totalCount, startTotal: b.startTotal,
    seen, hash, added: b.added, skippedExisting: b.skippedExisting, retries: b.failedRetryable,
    confirming, completedAt: new Date().toISOString(),
    newIdentities: previous ? seen.filter(id => !previousIds.has(id)).length : seen.length };
  b.stableSweeps = confirming ? (sameCoverage && b.added === 0 ? Math.min(2, b.stableSweeps + 1) : 1) : 0;
  b.previousSweep = summary;
  b.lastSweepCompletedAt = summary.completedAt;
  if (b.stableSweeps === 2) {
    b.complete = true;
    b.completionEvidence = { previousGeneration: previous.generation, previousHash: previous.hash,
      currentHash: hash, previousTotal: previous.total, confirmedAt: summary.completedAt };
  } else {
    const fresh = newBrand(BRANDS.find(rule => rule.slug === b.brand), b.generation + 1);
    Object.assign(b, fresh, { previousSweep: summary, stableSweeps: b.stableSweeps,
      cumulativeAdded: b.cumulativeAdded, cumulativeSkipped: b.cumulativeSkipped,
      cumulativeFailures: b.cumulativeFailures, lastSweepCompletedAt: summary.completedAt });
  }
  return summary;
}
function migrateLegacy(old, products) {
  validateLegacyState(old);
  // This authorized migration rewinds Allen Bradley only; other brands must
  // still be unstarted. Unexpected independently progressed state needs review.
  if (old.brands.some(b => b.brand !== "allen-bradley" && (b.lastCommittedPage || b.pending || b.complete))) fail("MIGRATION_UNEXPECTED_PROGRESS");
  const s = initialState(products);
  s.crawlId = old.crawlId;
  s.migration = { fromSchema: 1, timestamp: new Date().toISOString(),
    catalogCountPreserved: products.length, historicalStateRetained: true };
  for (const b of s.brands) {
    const prior = old.brands.find(p => p.brand === b.brand);
    b.generation = prior.lastCommittedPage || prior.pending ? 2 : 1;
    b.cumulativeAdded = prior.successful;
    b.cumulativeSkipped = prior.skippedExisting;
    b.cumulativeFailures = prior.failedRetryable;
  }
  return validateState(s);
}
function productFrom(item, rule, crawlId) {
  if (!item.model || !item.sourceUrl || !item.id) fail("PRODUCT_FIELDS");
  const url = new URL(item.sourceUrl);
  if (url.origin !== "https://www.classicautomation.com" || url.username || url.password || url.search || url.hash ||
      !/^\/(?:[a-z0-9._~-]+|parts\/[a-z0-9-]+\/[a-z0-9._~-]+)$/i.test(url.pathname)) fail("PRODUCT_URL_SCOPE");
  const model = String(item.model).trim();
  if (model.length > 160 || !/[a-z0-9]/i.test(model)) fail("PRODUCT_MODEL");
  const image = item.image && new URL(item.image).origin === url.origin && new URL(item.image).pathname.startsWith("/media/catalog/product/")
    ? item.image : "/product-images/default.jpg";
  return { slug: `${rule.slug}-${slugify(model)}`, brand: rule.brand, brandSlug: rule.slug, model,
    category: "Industrial Automation Part", description: item.description || `${rule.brand} ${model}`,
    image, source: "ClassicAutomation", sourceUrl: item.sourceUrl,
    acquisition: { workflow: "classic-complete", crawlId, sourceId: item.id } };
}
async function runBatch({ root = ROOT, source, maxItems = 600, maxPages = 50, maxMs = 480000, hook = () => {} } = {}) {
  if (![maxItems, maxPages, maxMs].every(x => Number.isSafeInteger(x) && x > 0)) fail("BATCH_LIMITS");
  const dataDir = path.join(root, "data"), statePath = path.join(dataDir, STATE_NAME);
  const catalogPath = path.join(dataDir, "products.json");
  const baselinePath = path.join(dataDir, "classic-complete-sweep-baseline.json");
  const unlock = acquire(path.join(dataDir, "classic-complete-catalog.lock"));
  if (!unlock) return { status: "LOCKED", network: 0 };
  const started = Date.now();
  const summary = { status: "INCOMPLETE", added: 0, skippedExisting: 0, duplicatesPrevented: 0, processed: 0, pagesCommitted: 0 };
  let s;
  try {
    let raw = fs.readFileSync(catalogPath, "utf8"), products = validateCatalog(JSON.parse(raw));
    summary.before = products.length;
    if (fs.existsSync(statePath)) {
      const loaded = json(statePath);
      if (loaded.schemaVersion === 1) {
        const backup = path.join(dataDir, "classic-complete-state-v1-backup.json");
        validateLegacyState(loaded);
        const original = validateCatalog(json(path.join(dataDir, "classic-complete-original-catalog.json")));
        const existingMap = new Map(products.map(p => [key(p), p]));
        if (digest(JSON.stringify(original)) !== loaded.initialCatalogHash ||
            original.some(p => JSON.stringify(existingMap.get(key(p))) !== JSON.stringify(p))) fail("ORIGINAL_PRODUCT_CHANGED");
        if (fs.existsSync(backup)) {
          if (JSON.stringify(json(backup)) !== JSON.stringify(loaded)) fail("MIGRATION_BACKUP_MISMATCH");
        } else atomic(backup, loaded, validateLegacyState);
        if (fs.existsSync(baselinePath)) {
          if (JSON.stringify(json(baselinePath)) !== JSON.stringify(products)) fail("MIGRATION_BASELINE_MISMATCH");
        } else atomic(baselinePath, products, validateCatalog);
        s = migrateLegacy(loaded, products);
        atomic(statePath, s, validateState);
        summary.migrated = true;
      } else s = validateState(loaded);
    } else {
      if (fs.existsSync(baselinePath) || fs.existsSync(path.join(dataDir, "classic-complete-original-catalog.json")) ||
          products.some(p => p.acquisition?.workflow === "classic-complete")) fail("STATE_MISSING_NO_RESET");
      s = initialState(products);
      atomic(baselinePath, products, validateCatalog);
      atomic(statePath, s, validateState);
    }
    const baseline = validateCatalog(json(baselinePath));
    const byKey = new Map(products.map(p => [key(p), p]));
    const bySlug = new Map(products.map(p => [norm(p.slug), p]));
    if (digest(JSON.stringify(baseline)) !== s.initialCatalogHash || baseline.length !== s.initialCatalogCount ||
        products.length < baseline.length || baseline.some(p => JSON.stringify(byKey.get(key(p))) !== JSON.stringify(p))) fail("ORIGINAL_PRODUCT_CHANGED");
    if (s.status === "FULLY_COMPLETE") return { ...summary, status: "COMPLETE", after: products.length, network: 0 };
    const save = () => atomic(statePath, s, validateState);
    const current = s.brands.find(b => !b.complete), rule = BRANDS.find(b => b.slug === current.brand);
    const seenIds = new Set(current.seen);
    summary.brand = current.brand; summary.startPage = current.currentPage; summary.startGeneration = current.generation;
    const deadline = Date.now() + maxMs;
    const sourceImpl = source || require("./classic-automation-source").createSource();
    try {
      while (summary.processed < maxItems && summary.pagesCommitted < maxPages && Date.now() < deadline) {
        if (!current.pending) {
          const r = await sourceImpl.list(rule, current.currentPage);
          const evidence = pageResult(r, current.currentPage);
          r.items.forEach(item => productFrom(item, rule, s.crawlId));
          if (current.startTotal === null) current.startTotal = r.total;
          if (current.startTotal !== r.total || !evidence.consistent) current.nonConfirming = true;
          current.totalCount = r.total; current.totalPages = r.pages;
          current.pending = { page: current.currentPage, total: r.total, pages: r.pages, ...evidence, items: r.items, cursor: 0 };
          save(); hook("afterListing");
        }
        const pending = current.pending;
        while (pending.cursor < pending.items.length && summary.processed < maxItems && Date.now() < deadline) {
          const item = pending.items[pending.cursor], id = norm(item.id);
          const candidate = productFrom(item, rule, s.crawlId);
          candidate.acquisition.generation = current.generation;
          const existing = byKey.get(key(candidate));
          const slugMatch = bySlug.get(norm(candidate.slug));
          if (!existing && slugMatch) fail("SLUG_IDENTITY_CONFLICT");
          const alreadySeen = seenIds.has(id);
          if (existing) {
            if (!alreadySeen && existing.acquisition?.crawlId === s.crawlId &&
                existing.acquisition.generation === current.generation && norm(existing.acquisition.sourceId) === id) {
              // The catalog rename succeeded before the cursor save was interrupted.
              current.added++; current.cumulativeAdded++;
            } else {
              current.skippedExisting++; current.cumulativeSkipped++;
              summary.skippedExisting++; summary.duplicatesPrevented++;
            }
          } else {
            const next = [...products, candidate];
            hook("beforeCatalog");
            atomic(catalogPath, next, rows => { validateCatalog(rows); if (rows.length !== products.length + 1) fail("CATALOG_RESET"); }, () => {
              if (fs.readFileSync(catalogPath, "utf8") !== raw) fail("CONCURRENT_CATALOG_CHANGE");
            });
            raw = fs.readFileSync(catalogPath, "utf8"); products = next;
            byKey.set(key(candidate), candidate); bySlug.set(norm(candidate.slug), candidate);
            hook("afterCatalog");
            current.added++; current.cumulativeAdded++; summary.added++;
          }
          if (!alreadySeen) { current.seen.push(id); seenIds.add(id); }
          pending.cursor++; summary.processed++;
          current.lastSuccessfulAt = new Date().toISOString(); current.lastErrorCategory = null;
          save(); hook("afterItemState");
        }
        if (pending.cursor !== pending.items.length) break;
        if (fs.readFileSync(catalogPath, "utf8") !== raw) fail("CONCURRENT_CATALOG_CHANGE");
        current.pageFingerprints.push(pending.fingerprint);
        current.lastCommittedPage = pending.page; current.currentPage++;
        current.pending = null; summary.pagesCommitted++;
        current.lastSuccessfulAt = new Date().toISOString(); current.lastErrorCategory = null;
        const endReached = pending.page >= Math.max(1, pending.pages) || pending.items.length === 0 || !pending.consistent;
        if (endReached) {
          const completed = finishSweep(current);
          summary.sweepResult = completed.confirming ? "SUCCESSFUL_SWEEP" : "NON_CONFIRMING";
          summary.sweepUniqueCount = completed.seen.length;
          summary.sweepNewIdentities = completed.newIdentities;
        }
        s.status = s.brands.every(b => b.complete) ? "FULLY_COMPLETE" : "INCOMPLETE";
        save();
        if (endReached) break; // Confirmation is a later bounded execution, not a tight loop.
      }
    } catch (e) {
      s = validateState(json(statePath));
      const failed = s.brands.find(b => b.brand === rule.slug);
      failed.failedRetryable++; failed.cumulativeFailures++;
      failed.lastErrorCategory = /^[A-Z_0-9]+$/.test(e.code || "") ? e.code : "BATCH_INTERRUPTED";
      atomic(statePath, s, validateState);
      summary.status = "BLOCKED"; summary.error = failed.lastErrorCategory;
    }
    summary.after = validateCatalog(json(catalogPath)).length;
    const end = s.brands.find(b => b.brand === rule.slug);
    summary.endPage = end.currentPage; summary.generation = end.generation;
    summary.lastCommittedPage = end.lastCommittedPage; summary.stableSweeps = end.stableSweeps;
    summary.pending = end.pending ? end.pending.items.length - end.pending.cursor : 0;
    summary.knownBrandTotal = end.totalCount ?? end.previousSweep?.total;
    summary.completedBrands = s.brands.filter(b => b.complete).length;
    summary.elapsedSeconds = (Date.now() - started) / 1000;
    if (s.status === "FULLY_COMPLETE") summary.status = "FULLY_COMPLETE";
    return summary;
  } finally { unlock(); }
}
module.exports = { ROOT, STATE_NAME, BRANDS, PAGE_SIZE, fail, digest, norm, key, atomic, acquire, initialState, validateState, validateLegacyState, migrateLegacy, finishSweep, setHash, validateCatalog, pageResult, productFrom, runBatch };
if (require.main === module) {
  const report = result => {
    const output = { timestamp: new Date().toISOString(), ...result };
    atomic(path.join(ROOT, "data/classic-complete-last-run.json"), output, value => { if (!value.status) fail("REPORT_INVALID"); });
    console.log(JSON.stringify(output));
  };
  const mode = process.argv.slice(2);
  if (mode.length !== 1 || !["--batch", "--controlled"].includes(mode[0])) {
    console.error("Use --controlled (12 items/1 page) or --batch (600 items/50 pages/8 minutes)."); process.exitCode = 2;
  } else runBatch(mode[0] === "--controlled" ? { maxItems: 12, maxPages: 1, maxMs: 120000 } : {})
    .then(result => { report(result); process.exitCode = result.status === "BLOCKED" || result.status === "LOCKED" ? 2 : 0; })
    .catch(e => {
      const result = { status: "BLOCKED", error: /^[A-Z_0-9]+$/.test(e.code || "") ? e.code : "LOCAL_VALIDATION_FAILED" };
      try { report(result); } catch { console.error(JSON.stringify(result)); }
      process.exitCode = 2;
    });
}
