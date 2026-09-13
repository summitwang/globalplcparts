"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const c = require("../scripts/classic-automation-complete-crawl"), tool = require("../scripts/product-image-integrity");
const files = require("../scripts/product-image-files"), policy = require("../lib/product-image-policy");
function fixture(t, image = "/product-images/missing.jpg") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gplp-images-"));
  fs.mkdirSync(path.join(root, "data")); fs.mkdirSync(path.join(root, "public/product-images"), { recursive: true });
  fs.copyFileSync(path.join(c.ROOT, "public", policy.FALLBACK), path.join(root, "public", policy.FALLBACK));
  const products = [{ brand: "ABB", model: "ABC", slug: "abb-abc", category: "PLC", sourceUrl: "https://www.classicautomation.com/abc", acquisition: { workflow: "old" }, image }];
  fs.writeFileSync(path.join(root, "data/products.json"), JSON.stringify(products));
  t.after(() => { assert.ok(root.startsWith(path.join(os.tmpdir(), "gplp-images-"))); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, products, read: () => JSON.parse(fs.readFileSync(path.join(root, "data/products.json"))) };
}
test("canonical fallback is a decodable 640px JPEG", async () => {
  const metadata = await require("sharp")(path.join(c.ROOT, "public", policy.FALLBACK)).metadata();
  assert.equal(metadata.format, "jpeg"); assert.equal(metadata.width, 640); assert.equal(metadata.height, 640);
});
test("valid existing local image preserved", t => {
  const f = fixture(t, "/product-images/custom.jpg");
  fs.copyFileSync(path.join(f.root, "public", policy.FALLBACK), path.join(f.root, "public/product-images/custom.jpg"));
  assert.equal(tool.repair({ root: f.root }).changed, 0); assert.deepEqual(f.read(), f.products);
});
test("valid canonical fallback accepted", t => {
  const f = fixture(t, policy.FALLBACK); assert.equal(tool.audit(f.root).broken, 0);
});
test("missing local file detected", t => { const f = fixture(t); assert.equal(tool.audit(f.root).counts.missing, 1); });
for (const [label, image] of [["missing", "/product-images/missing.jpg"], ["invalid", "/product-images/../secret.jpg"],
  ["external", "https://example.com/p.jpg"], ["empty", ""], ["protocol relative", "//example.com/p.jpg"],
  ["query", "/product-images/default.jpg?x=1"], ["encoded traversal", "/product-images/%2e%2e/x.jpg"]]) {
  test(label + " reference repaired to fallback", t => {
    const f = fixture(t, image); assert.equal(tool.repair({ root: f.root }).changed, 1);
    assert.equal(f.read()[0].image, policy.FALLBACK); assert.equal(tool.audit(f.root).broken, 0);
  });
}
test("invalid image file detected and repaired", t => {
  const f = fixture(t, "/product-images/empty.jpg"); fs.writeFileSync(path.join(f.root, "public/product-images/empty.jpg"), "");
  assert.equal(tool.audit(f.root).counts.invalidFile, 1); assert.equal(tool.repair({ root: f.root }).changed, 1);
});
test("repair idempotent, no second backup or catalog write", t => {
  const f = fixture(t); tool.repair({ root: f.root }); const file = path.join(f.root, "data/products.json"), time = fs.statSync(file).mtimeMs;
  assert.equal(tool.repair({ root: f.root }).status, "NOOP"); assert.equal(fs.statSync(file).mtimeMs, time);
  assert.equal(fs.readdirSync(path.join(f.root, "reports/product-image-integrity")).length, 1);
});
test("identity, slug, sourceUrl, acquisition and catalog count unchanged", t => {
  const f = fixture(t); tool.repair({ root: f.root }); const { image: before, ...old } = f.products[0], { image: after, ...now } = f.read()[0];
  assert.deepEqual(now, old); assert.equal(f.read().length, f.products.length);
});
test("backup is exact and receipt authorizes only the image difference", t => {
  const f = fixture(t), result = tool.repair({ root: f.root });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(result.backup, "catalog-before.json"))), f.products);
  const preserved = files.preservationCheck(f.root);
  assert.equal(preserved(f.read()[0], f.products[0]), true);
  for (const field of ["brand", "model", "slug", "sourceUrl", "category"]) assert.equal(preserved({ ...f.read()[0], [field]: "changed" }, f.products[0]), false);
});
test("unreceipted image difference remains rejected", t => {
  const f = fixture(t); assert.equal(files.preservationCheck(f.root)({ ...f.products[0], image: policy.FALLBACK }, f.products[0]), false);
});
test("interrupted atomic repair retains catalog and can resume", t => {
  const f = fixture(t); assert.throws(() => tool.repair({ root: f.root, beforeRename() { throw Error("interruption"); } }));
  assert.deepEqual(f.read(), f.products); assert.equal(tool.repair({ root: f.root }).changed, 1);
});
test("concurrent catalog change is not overwritten", t => {
  const f = fixture(t), changed = [{ ...f.products[0], model: "OTHER" }];
  assert.throws(() => tool.repair({ root: f.root, beforeRename() { fs.writeFileSync(path.join(f.root, "data/products.json"), JSON.stringify(changed)); } }), /CONCURRENT_CATALOG_CHANGE/);
  assert.deepEqual(f.read(), changed);
});
test("active crawler lock prevents repair", t => {
  const f = fixture(t), unlock = c.acquire(path.join(f.root, "data/classic-complete-catalog.lock"));
  try { assert.equal(tool.repair({ root: f.root }).status, "LOCKED"); assert.deepEqual(f.read(), f.products); } finally { unlock(); }
});
test("malformed catalog fails without repair", t => {
  const f = fixture(t), file = path.join(f.root, "data/products.json"); fs.writeFileSync(file, "{bad");
  assert.throws(() => tool.repair({ root: f.root })); assert.equal(fs.readFileSync(file, "utf8"), "{bad");
});
test("check mode writes nothing", t => {
  const f = fixture(t); const snapshot = () => fs.readdirSync(f.root, { recursive: true }).filter(n => fs.statSync(path.join(f.root, n)).isFile()).map(n => [n, fs.readFileSync(path.join(f.root, n)).toString("base64"), fs.statSync(path.join(f.root, n)).mtimeMs]);
  const before = snapshot(); tool.audit(f.root); assert.deepEqual(snapshot(), before);
});
test("new acquisition optional remote image uses local fallback", t => {
  const f = fixture(t); const p = c.productFrom({ id: "abc", model: "ABC", sourceUrl: "https://www.classicautomation.com/abc", image: "https://www.classicautomation.com/media/catalog/product/abc.jpg" }, c.BRANDS[1], "test", f.root);
  assert.equal(p.image, policy.FALLBACK);
});
test("rendering policy handles absent, remote and invalid sources", () => {
  for (const value of [undefined, null, "", "https://example.com/image.jpg", "//example.com/x.jpg", "/product-images/../x.jpg"])
    assert.equal(policy.applicationImage(value), policy.FALLBACK);
  assert.equal(policy.applicationImage("/product-images/custom.jpg"), "/product-images/custom.jpg");
});
test("repaired baseline resumes crawler without state reset", async t => {
  const f = fixture(t); const state = c.initialState(f.products);
  fs.writeFileSync(path.join(f.root, "data", c.STATE_NAME), JSON.stringify(state));
  fs.writeFileSync(path.join(f.root, "data/classic-complete-sweep-baseline.json"), JSON.stringify(f.products));
  tool.repair({ root: f.root });
  const result = await c.runBatch({ root: f.root, source: { list() { c.fail("HTTP_429"); } } });
  assert.equal(result.error, "HTTP_429"); assert.equal(result.startGeneration, 1); assert.equal(result.startPage, 1);
});
test("actual rendering uses fallback for absent/remote input and handles failed local image", () => {
  const ts = require("typescript"), source = fs.readFileSync(path.join(c.ROOT, "components/ProductImage.tsx"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  let failed = null;
  const exports = {};
  const load = name => name === "react" ? { useState: () => [failed, value => { failed = value; }] } : name === "@/lib/product-image-policy" ? policy : require(name);
  require("node:vm").runInNewContext(compiled, { exports, require: load });
  const Image = exports.default;
  assert.equal(Image({}).props.src, policy.FALLBACK);
  assert.equal(Image({ src: "https://example.com/a.jpg" }).props.src, policy.FALLBACK);
  const props = { src: "/product-images/missing.jpg" };
  const first = Image(props); assert.equal(first.props.src, props.src); first.props.onError();
  const fallback = Image(props); assert.equal(fallback.props.src, policy.FALLBACK); fallback.props.onError();
  assert.equal(Image({ src: "/product-images/new.jpg" }).props.src, "/product-images/new.jpg");
});
