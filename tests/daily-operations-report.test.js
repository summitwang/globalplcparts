"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { collect, render, TEXT_INPUTS, ROUTES } = require("../scripts/daily-operations-report.js");

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
  const readGit = () => ({ understood: true, changedPaths: 0, branch: "MAIN", fingerprint: "synthetic-stable" });
  return { root, write, product, post, readGit };
}

test("valid synthetic collection is stdout-ready, absent baseline is not zero or PASS", (t) => {
  const f = fixture(t);
  const contents = (directory) => fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).map((e) => {
    const file = path.join(directory, e.name);
    return [e.name, e.isDirectory() ? contents(file) : fs.readFileSync(file).toString("base64")];
  });
  const before = contents(f.root);
  const report = collect(f);
  assert.equal(report.status, "ATTENTION");
  assert.equal(report.baseline, "NOT ESTABLISHED");
  assert.equal(report.metrics.products, 1);
  assert.equal(report.metrics.missingLocalImageRecords, 0);
  assert.equal(report.coverage, "COMPLETE WITHIN STAGE 1");
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

test("no baseline is accepted in Stage 1, including an incompatible supplied baseline", (t) => {
  const f = fixture(t);
  const report = collect({ ...f, baseline: { task: "GPLP-AUTO-001", schema: 999, products: 0 } });
  assert.equal(report.baseline, "INCOMPATIBLE");
  assert.equal(report.status, "ATTENTION");
  assert.equal(report.metrics.products, 1);
  assert.ok(render(report).includes("Trends: NOT AVAILABLE"));
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
