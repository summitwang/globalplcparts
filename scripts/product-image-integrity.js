"use strict";
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS CLI, no application runtime required. */
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const c = require("./classic-automation-complete-crawl");
const images = require("./product-image-files");
function audit(root = c.ROOT) {
  const products = c.validateCatalog(JSON.parse(fs.readFileSync(path.join(root, "data/products.json"), "utf8")));
  const counts = { valid: 0, missing: 0, invalid: 0, empty: 0, remote: 0, invalidFile: 0 };
  const references = new Map(), cache = new Map(), failures = [];
  for (const p of products) {
    if (!cache.has(p.image)) cache.set(p.image, images.inspectImage(p.image, root));
    const { kind } = cache.get(p.image); counts[kind]++;
    if (kind !== "valid") failures.push({ slug: p.slug, image: p.image ?? null, kind });
    if (typeof p.image === "string") references.set(p.image, (references.get(p.image) || 0) + 1);
  }
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isSymbolicLink()) continue;
      const file = path.join(dir, e.name);
      if (e.isDirectory()) walk(file);
      else if (/\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(e.name)) files.push("/" + path.relative(path.join(root, "public"), file).replaceAll("\\", "/"));
    }
  }
  walk(path.join(root, "public/product-images"));
  return { timestamp: new Date().toISOString(), total: products.length, counts, broken: failures.length,
    fallback: products.filter(p => p.image === images.FALLBACK).length,
    fallbackValid: images.inspectImage(images.FALLBACK, root).kind === "valid", failures,
    reused: [...references].filter(([, count]) => count > 1).map(([image, count]) => ({ image, count })),
    legacyReferences: products.filter(p => typeof p.image === "string" && /\/(?:library|real)\//.test(p.image)).length,
    orphanedFiles: files.filter(file => !references.has(file)), orphanScope: "Catalog references only; files may be used elsewhere. Nothing deleted.",
    duplicateIdentities: 0, duplicateSlugs: 0 };
}
function repair({ root = c.ROOT, beforeRename = () => {} } = {}) {
  const unlock = c.acquire(path.join(root, "data/classic-complete-catalog.lock"));
  if (!unlock) return { status: "LOCKED", changed: 0 };
  try {
    if (images.inspectImage(images.FALLBACK, root).kind !== "valid") c.fail("CANONICAL_FALLBACK_MISSING");
    const file = path.join(root, "data/products.json"), raw = fs.readFileSync(file, "utf8");
    const products = c.validateCatalog(JSON.parse(raw)), changes = [], cache = new Map();
    const next = products.map(p => {
      if (!cache.has(p.image)) cache.set(p.image, images.localImage(p.image, root));
      const image = cache.get(p.image);
      if (p.image === image) return p;
      const fixed = { ...p, image }; changes.push({ before: images.hash(p), after: images.hash(fixed) }); return fixed;
    });
    if (!changes.length) return { status: "NOOP", changed: 0, before: products.length, after: products.length };
    c.validateCatalog(next);
    const directory = path.join(root, "reports/product-image-integrity", crypto.randomUUID());
    fs.mkdirSync(directory, { recursive: true });
    c.atomic(path.join(directory, "catalog-before.json"), products, c.validateCatalog);
    const ledgerPath = path.join(root, "data/product-image-repairs.json");
    images.preservationCheck(root); // Validate any previous ledger before extending it.
    const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { schema: 1, entries: [] };
    const known = new Set(ledger.entries.map(e => `${e.before}:${e.after}`));
    ledger.entries.push(...changes.filter(e => !known.has(`${e.before}:${e.after}`)));
    // Receipt precedes catalog commit: a crash cannot strand an authorized image repair
    // outside the crawler's unchanged baseline/identity protection.
    c.atomic(ledgerPath, ledger, x => { if (x.schema !== 1) c.fail("IMAGE_REPAIR_LEDGER_INVALID"); });
    c.atomic(file, next, c.validateCatalog, () => {
      beforeRename(); if (fs.readFileSync(file, "utf8") !== raw) c.fail("CONCURRENT_CATALOG_CHANGE");
    });
    const result = { status: "REPAIRED", changed: changes.length, before: products.length, after: next.length, backup: directory };
    c.atomic(path.join(directory, "repair.json"), result, () => {});
    return result;
  } finally { unlock(); }
}
module.exports = { audit, repair };
if (require.main === module) {
  try {
    const mode = process.argv.slice(2).join();
    if (!["--check", "--repair"].includes(mode)) c.fail("USE_CHECK_OR_REPAIR");
    const result = mode === "--check" ? audit() : repair();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "LOCKED" || result.broken > 0 || result.fallbackValid === false ? 2 : 0;
  } catch (e) { console.error(JSON.stringify({ status: "BLOCKED", error: /^[A-Z_0-9]+$/.test(e.code || "") ? e.code : "INVALID_LOCAL_INPUT" })); process.exitCode = 2; }
}
