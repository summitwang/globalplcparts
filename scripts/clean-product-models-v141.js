const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");

const DRY_RUN = process.argv.includes("--dry-run");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanModel(model) {
  let m = String(model || "").toUpperCase().trim();

  // 修复 V14 误加的图片序号：1756-L72-05 → 1756-L72
  m = m.replace(/-(0[1-9]|[1-9][0-9])$/i, "");

  // 修复 ClassicAutomation 常见版本尾缀：1756-L74-B → 1756-L74
  m = m.replace(/-(A|B|C|D|E|F|G|H|J|K|L|M|N|P|R|S|T|U|V|W|X|Y|Z)$/i, "");

  return m;
}

function rebuildProduct(product, model) {
  const brand = product.brand || "Allen Bradley";
  const brandSlug = product.brandSlug || slugify(brand);
  const slug = `${brandSlug}-${slugify(model)}`;

  return {
    ...product,
    model,
    slug,
    brandSlug,
    seoTitle: `${brand} ${model} PLC Module Supplier | GlobalPLCParts`,
    seoDescription: `Request a quote for ${brand} ${model} PLC Module. GlobalPLCParts supplies PLC, DCS, HMI and industrial automation spare parts with worldwide shipping.`,
    rfqText: `Request a quotation for ${brand} ${model}. Send quantity and destination country to check price, stock and lead time.`,
    keywords: [
      `${brand} ${model}`,
      `${brand} ${model} supplier`,
      `${brand} ${model} price`,
      `${brand} ${model} stock`,
      `${brand} spare parts`,
      `${model} replacement`,
      `${model} module`
    ],
  };
}

function scoreProduct(p) {
  let score = 0;
  const img = String(p.image || "").toLowerCase();

  if (img.includes("classic")) score += 5;
  if (img.includes("/product-images/real/")) score += 4;
  if (img.includes("default")) score -= 5;
  if (img.includes("placeholder")) score -= 5;
  if (p.description) score += 1;
  if (p.seoTitle) score += 1;

  return score;
}

function main() {
  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error("products.json not found:", PRODUCTS_PATH);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const map = new Map();

  let cleaned = 0;
  let duplicates = 0;

  for (const product of products) {
    const oldModel = product.model;
    const newModel = cleanModel(oldModel);

    let p = product;

    if (newModel !== oldModel) {
      cleaned++;
      p = rebuildProduct(product, newModel);
    }

    const key = `${String(p.brand || "").toLowerCase()}__${String(p.model || "").toUpperCase()}`;

    if (!map.has(key)) {
      map.set(key, p);
      continue;
    }

    duplicates++;

    const existing = map.get(key);

    if (scoreProduct(p) > scoreProduct(existing)) {
      map.set(key, p);
    }
  }

  const output = Array.from(map.values());

  console.log("Product Model Cleaner V14.1 finished");
  console.log("Original products:", products.length);
  console.log("Cleaned models:", cleaned);
  console.log("Duplicates removed:", duplicates);
  console.log("Final products:", output.length);
  console.log("Dry run:", DRY_RUN ? "YES" : "NO");

  if (!DRY_RUN) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(output, null, 2), "utf8");
    console.log("products.json updated.");
  }
}

main();