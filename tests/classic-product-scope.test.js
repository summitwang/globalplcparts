"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const c = require("../scripts/classic-automation-complete-crawl"), a = require("../scripts/classic-automation-source");
const ORIGIN = "https://www.classicautomation.com", SKU = "22B-D1P4C104";
const observed = "//www.classicautomation.com/catalog/product/view/id/1827716/s/22b-d1p4c104/";
const body = canonical_url => ({ data: { productSearch: { total_count: 8932,
  page_info: { current_page: 280, page_size: 12, total_pages: 745 },
  items: Array.from({ length: 12 }, (_, i) => ({ product: { sku: i === 5 ? SKU : `AB${i}`, canonical_url: i === 5 ? canonical_url : `/ab${i}` } })) } } });
for (const url of ["/22b-d1p4c104", "/parts/allen-bradley/22b-d1p4c104", observed])
  test("approved product route accepted: " + url, () => {
    const item = a.parseResponse(body(url), c.BRANDS[0], 280).items[5];
    assert.equal(c.productFrom(item, c.BRANDS[0], "test").sourceUrl, new URL(url, ORIGIN).href);
  });
for (const url of [
  "https://example.com/22b-d1p4c104", "http://www.classicautomation.com/22b-d1p4c104",
  "https://user:pass@www.classicautomation.com/22b-d1p4c104", "/22b-d1p4c104?redirect=/admin", "/22b-d1p4c104#details",
  "/admin", "/admin/product", "/private", "/account", "/customer/account/login", "/login", "/cart", "/checkout", "/checkout/cart",
  "/search", "/catalogsearch/result/", "/api", "/api/product", "/rest", "/graphql", "/static", "/static/product.jpg",
  "/unrelated/category/part", "/parts/unapproved/22b-d1p4c104", "https://[invalid",
  "/catalog/product/view/id/no-number/s/22b-d1p4c104/", "/catalog/product/view/id/0/s/22b-d1p4c104/",
  "/catalog/product/view/id/1827716/s/wrong-sku/", "/catalog/product/view/id/1827716/",
  "/catalog/product/view/id/1827716/s/22b-d1p4c104/private", "/catalog/product/view/id/1827716/s/22b%2fd1p4c104/",
]) test("unsafe or unverified product route rejected: " + url, () => {
  assert.throws(() => a.parseResponse(body(url), c.BRANDS[0], 280));
  assert.throws(() => c.productFrom({ id: SKU, model: SKU, sourceUrl: url.startsWith("http") ? url : ORIGIN + url }, c.BRANDS[0], "test"));
});
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gplp-scope-"));
  fs.mkdirSync(path.join(root, "data"));
  const products = [{ brand: "ABB", model: "OLD", slug: "abb-old", category: "PLC" }];
  const state = c.initialState(products);
  Object.assign(state.brands[0], { generation: 2, currentPage: 280, lastCommittedPage: 279,
    pageFingerprints: Array(279).fill("diagnostic"), startTotal: 8932, totalCount: 8932, totalPages: 745 });
  for (const [file, value] of [["products.json", products], [c.STATE_NAME, state], ["classic-complete-sweep-baseline.json", products]])
    fs.writeFileSync(path.join(root, "data", file), JSON.stringify(value));
  t.after(() => { assert.ok(root.startsWith(path.join(os.tmpdir(), "gplp-scope-"))); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, read: () => JSON.parse(fs.readFileSync(path.join(root, "data", c.STATE_NAME))) };
}
test("actual page-280-shaped fixture commits only with verified structural fix", async t => {
  const f = fixture(t);
  assert.equal(/^\/(?:[a-z0-9._~-]+|parts\/[a-z0-9-]+\/[a-z0-9._~-]+)$/i.test(new URL(observed, ORIGIN).pathname), false);
  const r = await c.runBatch({ root: f.root, maxPages: 1, source: { list: async (rule, page) => { assert.equal(page, 280); return a.parseResponse(body(observed), rule, page); } } });
  assert.equal(r.status, "INCOMPLETE"); assert.equal(r.pagesCommitted, 1); assert.equal(r.added, 12);
  assert.equal(f.read().brands[0].generation, 2); assert.equal(f.read().brands[0].currentPage, 281);
});
test("unsafe page item remains blocking and never advances checkpoint", async t => {
  const f = fixture(t), catalog = fs.readFileSync(path.join(f.root, "data/products.json"));
  const r = await c.runBatch({ root: f.root, maxPages: 1, source: { list: async rule => a.parseResponse(body("https://example.com/outside"), rule, 280) } });
  assert.equal(r.status, "BLOCKED"); assert.equal(r.error, "PUBLIC_PRODUCT_SCOPE");
  assert.equal(f.read().brands[0].currentPage, 280); assert.equal(f.read().brands[0].lastCommittedPage, 279);
  assert.deepEqual(fs.readFileSync(path.join(f.root, "data/products.json")), catalog);
});
test("category membership still comes from exact approved listing request", async () => {
  const requests = [];
  const source = a.createSource({ pause: async () => {}, request: async options => {
    requests.push(options);
    if (options.method === "POST") return { status: 200, data: body(observed) };
    if (options.url.includes("/static/")) return { status: 200, data: a.SEARCH + " query productSearch( total_pages" };
    return { status: 200, data: '<div x-data="liveSearchPlp()" data-category-url-path="parts/allen-bradley" ' +
      ['environment-id','website-code','store-code','store-view-code','api-key','customer-group'].map(k => `data-${k}="public-fixture"`).join(" ") +
      '></div><script src="https://www.classicautomation.com/static/Hyva_MagentoLiveSearch/js/sdk.js"></script>' };
  } });
  await source.list(c.BRANDS[0], 280);
  assert.deepEqual(requests.at(-1).data.variables.filter, [{ attribute: "categoryPath", eq: "parts/allen-bradley" }]);
  assert.equal(requests.at(-1).data.variables.current_page, 280);
  await assert.rejects(source.list({ ...c.BRANDS[0], category: "parts/unapproved" }, 280), /LISTING_SCOPE/);
  assert.equal(requests.length, 3);
});
test("existing baseline parts-index reference is preserved but never accepted for acquisition", t => {
  const f = fixture(t), old = { brand: "ABB", model: "PARTS", slug: "abb-parts", category: "PLC", source: "ClassicAutomation", sourceUrl: ORIGIN + "/parts" };
  const state = c.initialState([old]);
  fs.writeFileSync(path.join(f.root, "data/classic-complete-sweep-baseline.json"), JSON.stringify([old]));
  assert.equal(require("../scripts/classic-automation-lifecycle").integrity(f.root, state, [old]).historicalReferences, 1);
  assert.throws(() => c.productFrom({ id: "PARTS", model: "PARTS", sourceUrl: old.sourceUrl }, c.BRANDS[1], "test"), /PRODUCT_URL_SCOPE/);
});
