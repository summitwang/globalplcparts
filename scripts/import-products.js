const fs = require("fs");
const path = require("path");

const csvPath = path.join(process.cwd(), "products.csv");
const jsonPath = path.join(process.cwd(), "data", "products.json");

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const item = {};

    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });

    return item;
  });
}

if (!fs.existsSync(csvPath)) {
  console.error("products.csv not found");
  process.exit(1);
}

const csv = fs.readFileSync(csvPath, "utf-8");
const rows = parseCSV(csv);

let existingProducts = [];

if (fs.existsSync(jsonPath)) {
  existingProducts = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

const productMap = new Map();

for (const product of existingProducts) {
  const key = `${product.brandSlug}-${product.model}`.toLowerCase();
  productMap.set(key, product);
}

for (const item of rows) {
  if (!item.brand || !item.model) continue;

  const brandSlug = item.brandSlug || slugify(item.brand);
  const slug = `${brandSlug}-${slugify(item.model)}`;
  const key = `${brandSlug}-${item.model}`.toLowerCase();

  const newProduct = {
    slug,
    brand: item.brand,
    brandSlug,
    model: item.model,
    category: item.category || "Industrial Automation Part",
    description:
      item.description ||
      `${item.brand} ${item.model} supplied by GlobalPLCParts for industrial automation applications.`,
    image: item.image || "",
  };

  productMap.set(key, {
    ...productMap.get(key),
    ...newProduct,
  });
}

const products = Array.from(productMap.values());

fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), "utf-8");

console.log(`Imported ${rows.length} rows`);
console.log(`Total products in database: ${products.length}`);