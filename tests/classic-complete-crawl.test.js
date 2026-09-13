"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const c = require("../scripts/classic-automation-complete-crawl");
const adapter = require("../scripts/classic-automation-source");
const original = { brand: "Allen Bradley", model: "AB100", slug: "allen-bradley-ab100", category: "PLC", description: "Preserve exactly" };
const item = n => ({ id: "sku-" + n, model: "AB" + n, sourceUrl: "https://www.classicautomation.com/ab" + n });
const range = n => Array.from({ length: n }, (_, i) => 100 + i);
function listing(ids = range(13)) {
  let calls = 0;
  return { get calls() { return calls; }, async list(rule, page) {
    calls++;
    return { page, pageSize: 12, pages: Math.ceil(ids.length / 12), total: ids.length,
      items: ids.slice((page - 1) * 12, page * 12).map(item) };
  } };
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gplp-classic-test-"));
  fs.mkdirSync(path.join(root, "data"));
  const catalog = path.join(root, "data/products.json"), state = path.join(root, "data", c.STATE_NAME);
  fs.writeFileSync(catalog, JSON.stringify([original]));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, catalog, state, read: () => JSON.parse(fs.readFileSync(state)), products: () => JSON.parse(fs.readFileSync(catalog)) };
}
function legacyState(products) {
  return { schemaVersion: 1, crawlId: require("node:crypto").randomUUID(), status: "INCOMPLETE", pageSize: 12,
    initialCatalogCount: products.length, initialCatalogHash: c.digest(JSON.stringify(products)),
    brands: c.BRANDS.map(b => ({ brand: b.slug, currentPage: 1, lastCommittedPage: 0, pending: null,
      totalCount: null, totalPages: null, seen: [], pageFingerprints: [], successful: 0, skippedExisting: 0,
      duplicatesPrevented: 0, failedRetryable: 0, consecutiveConfirmedEmptyPages: 0,
      complete: false, lastSuccessfulAt: null, lastErrorCategory: null, finalEvidence: null })) };
}
test("17 approved categories, Schneider and GE migration remain mapped", () => {
  assert.equal(c.BRANDS.length, 17);
  assert.equal(c.BRANDS.find(b => b.slug === "schneider").category, "parts/schneider");
  assert.equal(c.BRANDS.find(b => b.slug === "ge-fanuc").category, "parts/ge-general-electric");
});
test("GE aliases deduplicate without rewriting historical records", () => {
  const p = { ...original, brand: "GE Fanuc", model: "IC693CPU331" }, before = JSON.stringify(p);
  for (const brand of ["GE", "General Electric", "GE / General Electric", "GE - General Electric"])
    assert.equal(c.key({ brand, model: "ic693cpu331" }), c.key(p));
  assert.equal(JSON.stringify(p), before);
  assert.throws(() => c.validateCatalog([p, { ...p, brand: "GE", slug: "different" }]), /CATALOG_DUPLICATE/);
});
test("page checkpoint follows durable catalog writes", async t => {
  const f = fixture(t); const r = await c.runBatch({ root: f.root, source: listing(), maxPages: 1 });
  assert.equal(r.added, 11); assert.equal(r.skippedExisting, 1); assert.equal(r.pagesCommitted, 1);
  assert.equal(f.read().brands[0].currentPage, 2); assert.equal(f.products().length, 12);
  assert.deepEqual(f.products()[0], original);
});
test("persistent pending queue resumes before another request", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(), maxItems: 2 });
  assert.equal(f.read().brands[0].pending.cursor, 2); assert.equal(f.read().brands[0].lastCommittedPage, 0);
  const r = await c.runBatch({ root: f.root, source: { list() { throw new Error("unexpected request"); } }, maxItems: 2 });
  assert.equal(r.status, "INCOMPLETE"); assert.equal(f.read().brands[0].pending.cursor, 4);
});
for (const stage of ["afterListing", "beforeCatalog", "afterCatalog", "afterItemState"]) {
  test("interruption at " + stage + " recovers exactly once", async t => {
    const f = fixture(t); let fired = false;
    await c.runBatch({ root: f.root, source: listing(range(2)), hook(at) { if (at === stage && !fired) { fired = true; throw Error("interruption"); } } });
    assert.equal(f.read().brands[0].lastCommittedPage, 0);
    await c.runBatch({ root: f.root, source: listing(range(2)) });
    const b = f.read().brands[0];
    assert.equal(b.previousSweep.added, 1); assert.equal(b.previousSweep.skippedExisting, 1);
    assert.equal(b.generation, 2); assert.equal(b.stableSweeps, 1); assert.equal(b.complete, false);
    assert.equal(f.products().length, 2); c.validateCatalog(f.products());
  });
}
test("network failure never advances an unverified page", async t => {
  const f = fixture(t);
  const r = await c.runBatch({ root: f.root, source: { list() { c.fail("NETWORK_RETRY_EXHAUSTED"); } } });
  assert.equal(r.error, "NETWORK_RETRY_EXHAUSTED"); assert.equal(f.read().brands[0].currentPage, 1);
  assert.equal(f.read().brands[0].failedRetryable, 1);
});
test("a resolved network failure does not prevent later successful convergence", async t => {
  const f = fixture(t);
  await c.runBatch({ root: f.root, source: { list() { c.fail("NETWORK_RETRY_EXHAUSTED"); } } });
  await c.runBatch({ root: f.root, source: listing(range(2)) });
  await c.runBatch({ root: f.root, source: listing(range(2)) });
  assert.equal(f.read().brands[0].complete, true);
});
test("brand needs two full sweeps; second unchanged sweep adds zero", async t => {
  const f = fixture(t);
  await c.runBatch({ root: f.root, source: listing(range(13)) });
  assert.equal(f.read().brands[0].stableSweeps, 1); assert.equal(f.read().brands[0].complete, false);
  const r = await c.runBatch({ root: f.root, source: listing(range(13)) });
  assert.equal(r.added, 0); assert.equal(r.skippedExisting, 13);
  assert.equal(f.read().brands[0].stableSweeps, 2); assert.equal(f.read().brands[0].complete, true);
});
test("ordering and per-page fingerprint changes are diagnostic only", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(range(13)) });
  const r = await c.runBatch({ root: f.root, source: listing(range(13).reverse()) });
  assert.notEqual(r.status, "BLOCKED"); assert.equal(f.read().brands[0].complete, true);
});
for (const direction of ["earlier", "later"]) {
  test("SKU moving to an " + direction + " page during a sweep is non-confirming, not fatal", async t => {
    const f = fixture(t); await c.runBatch({ root: f.root, source: listing(range(13)), maxPages: 1 });
    const shifted = direction === "earlier" ? [112, ...range(12)] : [...range(13).slice(1), 100];
    const r = await c.runBatch({ root: f.root, source: listing(shifted) });
    assert.equal(r.sweepResult, "NON_CONFIRMING"); assert.notEqual(r.status, "BLOCKED");
    assert.equal(f.read().brands[0].generation, 2); assert.equal(f.read().brands[0].currentPage, 1);
    await c.runBatch({ root: f.root, source: listing(shifted) });
    await c.runBatch({ root: f.root, source: listing(shifted) });
    assert.equal(f.read().brands[0].complete, true); c.validateCatalog(f.products());
  });
}
for (const n of [12, 14]) {
  test("total_count " + (n < 13 ? "decrease" : "increase") + " during sweep preserves progress and repeats verification", async t => {
    const f = fixture(t); await c.runBatch({ root: f.root, source: listing(range(13)), maxPages: 1 });
    const r = await c.runBatch({ root: f.root, source: listing(range(n)) });
    assert.equal(r.sweepResult, "NON_CONFIRMING"); assert.notEqual(r.status, "BLOCKED");
    assert.equal(f.read().brands[0].currentPage, 1); assert.equal(f.products().length, n);
    await c.runBatch({ root: f.root, source: listing(range(n)) });
    await c.runBatch({ root: f.root, source: listing(range(n)) });
    assert.equal(f.read().brands[0].complete, true);
  });
}
test("disappearing SKU is preserved; changed count between sweeps requires another confirmation", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(range(3)) });
  const before = f.products();
  await c.runBatch({ root: f.root, source: listing(range(2)) });
  assert.deepEqual(f.products(), before); assert.equal(f.read().brands[0].stableSweeps, 1);
  assert.equal(f.read().brands[0].complete, false);
  await c.runBatch({ root: f.root, source: listing(range(2)) });
  assert.equal(f.read().brands[0].complete, true); assert.equal(f.products().length, 3);
});
test("new identity with equal count prevents convergence", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing([100, 101]) });
  await c.runBatch({ root: f.root, source: listing([100, 102]) });
  assert.equal(f.read().brands[0].complete, false); assert.equal(f.read().brands[0].previousSweep.newIdentities, 1);
  assert.equal(f.products().length, 3);
});
test("new source identity already present locally still prevents convergence", async t => {
  const f = fixture(t); fs.writeFileSync(f.catalog, JSON.stringify([original, { ...original, model: "AB102", slug: "allen-bradley-ab102" }]));
  await c.runBatch({ root: f.root, source: listing([100, 101]) });
  const r = await c.runBatch({ root: f.root, source: listing([100, 102]) });
  assert.equal(r.added, 0); assert.equal(f.read().brands[0].complete, false);
});
test("state-only generation restart does not reset catalog or other brands", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(range(2)) });
  const b = f.read().brands[0];
  assert.equal(b.currentPage, 1); assert.equal(b.generation, 2); assert.equal(f.products().length, 2);
  assert.equal(f.read().brands[1].generation, 1); assert.equal(f.read().brands[1].currentPage, 1);
});
test("non-confirming traversal interrupts the consecutive stable-sweep chain", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(range(13)) });
  await c.runBatch({ root: f.root, source: listing(range(13)), maxPages: 1 });
  await c.runBatch({ root: f.root, source: listing([112, ...range(12)]) });
  assert.equal(f.read().brands[0].stableSweeps, 0);
  await c.runBatch({ root: f.root, source: listing(range(13)) });
  assert.equal(f.read().brands[0].stableSweeps, 1); assert.equal(f.read().brands[0].complete, false);
});
test("empty catalog needs two successful sweeps, not one empty response", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing([]) });
  assert.equal(f.read().brands[0].complete, false);
  await c.runBatch({ root: f.root, source: listing([]) });
  assert.equal(f.read().brands[0].complete, true);
});
test("short final page and metadata drift do not create a fatal error", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(range(13)), maxPages: 1 });
  const s = listing(range(13)); const r = await c.runBatch({ root: f.root, source: { async list(rule, page) { const p = await s.list(rule, page); p.items = []; return p; } } });
  assert.equal(r.sweepResult, "NON_CONFIRMING"); assert.equal(f.read().brands[0].complete, false);
});
test("repeated listings cannot falsely meet unique coverage total", async t => {
  const f = fixture(t);
  const r = await c.runBatch({ root: f.root, source: { async list(rule, page) { return { page, pageSize: 12, pages: 2, total: 24, items: range(12).map(item) }; } } });
  assert.equal(r.sweepResult, "NON_CONFIRMING"); assert.equal(f.products().length, 12);
});
test("all 17 require two sweeps, then FULLY_COMPLETE exits without network", async t => {
  const f = fixture(t); const source = listing([]);
  for (let i = 0; i < 34; i++) await c.runBatch({ root: f.root, source });
  assert.equal(f.read().status, "FULLY_COMPLETE"); assert.equal(source.calls, 34);
  const r = await c.runBatch({ root: f.root, source: { list() { throw Error("forbidden network"); } } });
  assert.equal(r.status, "COMPLETE"); assert.equal(r.network, 0);
});
test("legacy migration preserves catalog and archives old state, rewinding only Allen Bradley", async t => {
  const f = fixture(t); const old = legacyState([original]); const b = old.brands[0];
  Object.assign(b, { currentPage: 2, lastCommittedPage: 1, totalCount: 13, totalPages: 2,
    seen: range(12).map(n => "sku-" + n), pageFingerprints: ["diagnostic-only"], successful: 11, skippedExisting: 1, duplicatesPrevented: 1 });
  const products = [original, ...range(12).slice(1).map(n => c.productFrom(item(n), c.BRANDS[0], old.crawlId))];
  fs.writeFileSync(f.catalog, JSON.stringify(products)); fs.writeFileSync(f.state, JSON.stringify(old));
  fs.writeFileSync(path.join(f.root, "data/classic-complete-original-catalog.json"), JSON.stringify([original]));
  const r = await c.runBatch({ root: f.root, source: { list() { c.fail("NETWORK_RETRY_EXHAUSTED"); } } });
  assert.equal(r.migrated, true); assert.equal(f.read().schemaVersion, 2);
  assert.equal(f.read().brands[0].generation, 2); assert.equal(f.read().brands[0].currentPage, 1);
  assert.equal(f.read().brands[1].generation, 1); assert.deepEqual(f.products(), products);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root, "data/classic-complete-state-v1-backup.json"))), old);
});
test("legacy migration refuses unexpected progress on other brands", () => {
  const old = legacyState([original]); const b = old.brands[1];
  Object.assign(b, { currentPage: 2, lastCommittedPage: 1, pageFingerprints: ["x"], totalCount: 0, totalPages: 0 });
  assert.throws(() => c.migrateLegacy(old, [original]), /MIGRATION_UNEXPECTED_PROGRESS/);
});
test("corrupt state is rejected without reset or network", async t => {
  const f = fixture(t); fs.writeFileSync(f.state, "{bad"); const source = listing();
  await assert.rejects(c.runBatch({ root: f.root, source })); assert.equal(source.calls, 0);
  assert.equal(fs.readFileSync(f.state, "utf8"), "{bad");
});
test("forged completed state without convergence evidence is rejected", () => {
  const s = c.initialState([original]); s.brands[0].complete = true;
  assert.throws(() => c.validateState(s));
});
test("previous sweep manifest hash detects identity corruption", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(range(2)) });
  const s = f.read(); s.brands[0].previousSweep.seen[0] = "corrupted";
  assert.throws(() => c.validateState(s), /STATE_PREVIOUS_SWEEP/);
});
for (const kind of ["catalog", "state"]) {
  test(kind + " atomic write leaves original JSON on failed replacement", t => {
    const f = fixture(t), file = kind === "catalog" ? f.catalog : f.state;
    fs.writeFileSync(file, '{"old":true}');
    assert.throws(() => c.atomic(file, { next: true }, () => {}, () => { throw Error("interruption"); }));
    assert.deepEqual(JSON.parse(fs.readFileSync(file)), { old: true });
    assert.equal(fs.readdirSync(path.dirname(file)).filter(n => n.endsWith(".tmp")).length, 0);
  });
}
test("catalog atomic validator rejects empty replacement", t => {
  const f = fixture(t); assert.throws(() => c.atomic(f.catalog, [], c.validateCatalog));
  assert.deepEqual(f.products(), [original]);
});
test("exclusive lock prevents a competing instance without network", async t => {
  const f = fixture(t), lock = path.join(f.root, "data/classic-complete-catalog.lock"), release = c.acquire(lock);
  const source = listing(); assert.equal((await c.runBatch({ root: f.root, source })).status, "LOCKED");
  assert.equal(source.calls, 0); release();
});
test("dead owner lock recovery preserves checkpoint; malformed lock stays blocked", t => {
  const f = fixture(t), lock = path.join(f.root, "data/classic-complete-catalog.lock");
  fs.writeFileSync(f.state, "preserve"); fs.writeFileSync(lock, '{"pid":123456}');
  const release = c.acquire(lock, () => false); assert.equal(typeof release, "function"); release();
  assert.equal(fs.readFileSync(f.state, "utf8"), "preserve");
  fs.writeFileSync(lock, "bad"); assert.equal(c.acquire(lock, () => false), null);
});
test("missing state after initialization never resets catalog", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(), maxItems: 1 });
  fs.unlinkSync(f.state); await assert.rejects(c.runBatch({ root: f.root, source: listing() }), /STATE_MISSING_NO_RESET/);
});
test("modified original record blocks; no silent catalog reset", async t => {
  const f = fixture(t); await c.runBatch({ root: f.root, source: listing(), maxItems: 1 });
  fs.writeFileSync(f.catalog, JSON.stringify([{ ...original, description: "changed" }]));
  await assert.rejects(c.runBatch({ root: f.root, source: listing() }), /ORIGINAL_PRODUCT_CHANGED/);
});
test("concurrent catalog change prevents replacement", async t => {
  const f = fixture(t), extra = { ...original, model: "OUT9", slug: "out9" };
  const r = await c.runBatch({ root: f.root, source: listing(range(2)), hook(stage) {
    if (stage === "beforeCatalog") fs.writeFileSync(f.catalog, JSON.stringify([original, extra]));
  } });
  assert.equal(r.error, "CONCURRENT_CATALOG_CHANGE"); assert.deepEqual(f.products(), [original, extra]);
});
test("same slug for a different model blocks instead of dropping identity", async t => {
  const f = fixture(t), p = { ...original, model: "A/B1", slug: "allen-bradley-a-b1" };
  fs.writeFileSync(f.catalog, JSON.stringify([p]));
  const source = { async list() { return { total: 1, pages: 1, page: 1, pageSize: 12, items: [{ ...item(100), model: "A-B1" }] }; } };
  assert.equal((await c.runBatch({ root: f.root, source })).error, "SLUG_IDENTITY_CONFLICT");
  assert.deepEqual(f.products(), [p]);
});
test("public response projection drops commercial fields and rejects source-scope changes", () => {
  const body = { data: { productSearch: { total_count: 1, page_info: { current_page: 1, page_size: 12, total_pages: 1 }, items: [{ product: {
    sku: "1756-L61/A", canonical_url: "//www.classicautomation.com/1756-l61-a", price_range: { secret: "unused" }, short_description: { html: "<b>Controller</b>" },
  } }] } } };
  const r = adapter.parseResponse(body, c.BRANDS[0], 1); assert.equal(r.items[0].model, "1756-L61/A");
  assert.equal(r.items[0].description, "Controller"); assert.equal(JSON.stringify(r).includes("price"), false);
  body.data.productSearch.items[0].product.canonical_url = "https://unapproved.example/model";
  assert.throws(() => adapter.parseResponse(body, c.BRANDS[0], 1));
});
test("public config category mismatch blocks", () => {
  assert.throws(() => adapter.parseConfig('<div x-data="liveSearchPlp()" data-category-url-path="parts/other"></div>', c.BRANDS[0]));
});
test("adapter restricts requests and uses bounded network retries", async () => {
  let requests = 0;
  const source = adapter.createSource({ pause: async () => {}, request: async () => { requests++; throw new Error("offline"); } });
  await assert.rejects(source.list(c.BRANDS[0], 1), /NETWORK_RETRY_EXHAUSTED/); assert.equal(requests, 2);
  await assert.rejects(source.list({ slug: "other", category: "parts/other" }, 1), /LISTING_SCOPE/); assert.equal(requests, 2);
});
test("403 and 429 stop without access-control bypass or immediate retry", async () => {
  for (const status of [403, 429]) {
    let count = 0; const source = adapter.createSource({ pause: async () => {}, request: async () => { count++; throw { response: { status } }; } });
    await assert.rejects(source.list(c.BRANDS[0], 1), new RegExp(`HTTP_${status}`)); assert.equal(count, 1);
  }
});
test("standalone modules never invoke unrelated scripts or load env", () => {
  for (const name of ["classic-automation-complete-crawl.js", "classic-automation-source.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "../scripts", name), "utf8");
    assert.doesNotMatch(source, /require\(["'](?:child_process|node:child_process|dotenv)|process\.env|execSync|spawn\(/);
    assert.doesNotMatch(source, /require\(["'][^"']*(?:product-expansion|image-engine|daily-operations|daily-health)/);
  }
});
