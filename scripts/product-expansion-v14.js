const fs = require("fs");
const path = require("path");

const BRAND = process.argv[2] || "Allen-Bradley";

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");

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

const brandSlug = slugify(BRAND);

const IMAGE_DIR = path.join(
  process.cwd(),
  "public",
  "product-images",
  "real",
  brandSlug
);

function cleanModelFromFile(file) {
  return String(file)
    .replace(/\.(jpg|jpeg|png|webp)$/i, "")
    .replace(/^allen-bradley-/i, "")
    .replace(/^ab-/i, "")
    .replace(/^classic-detail-/i, "")
    .replace(/^classic-/i, "")
    .replace(/-classic-detail-\d+-\d+$/i, "")
    .replace(/-classic-\d+-\d+$/i, "")
    .toUpperCase();
}

function makeProduct(brand, model, image) {
  const slug = `${slugify(brand)}-${slugify(model)}`;

  return {
    slug,
    brand: brand.replace("-", " "),
    brandSlug: slugify(brand),
    model,
    category: "PLC Module",
    description: `${brand.replace("-", " ")} ${model} PLC Module for industrial automation systems, PLC control, DCS process automation, factory maintenance and spare parts replacement.`,
    image,
    seoTitle: `${brand.replace("-", " ")} ${model} PLC Module Supplier | GlobalPLCParts`,
    seoDescription: `Request a quote for ${brand.replace("-", " ")} ${model} PLC Module. GlobalPLCParts supplies PLC, DCS, HMI and industrial automation spare parts with worldwide shipping.`,
    keywords: [
      `${brand.replace("-", " ")} ${model}`,
      `${brand.replace("-", " ")} ${model} supplier`,
      `${brand.replace("-", " ")} ${model} price`,
      `${brand.replace("-", " ")} ${model} stock`,
      `${brand.replace("-", " ")} spare parts`,
      `${model} replacement`,
      `${model} module`
    ],
    availability: "Available on request",
    warranty: "12 months warranty available",
    shipping: "Worldwide shipping supported",
    rfqText: `Request a quotation for ${brand.replace("-", " ")} ${model}. Send quantity and destination country to check price, stock and lead time.`,
    applications: [
      "PLC control system",
      "DCS process automation",
      "Factory maintenance",
      "Production line replacement",
      "Industrial control cabinet"
    ],
    source: "ClassicAutomation image import"
  };
}

function main() {
  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error("products.json not found");
    process.exit(1);
  }

  if (!fs.existsSync(IMAGE_DIR)) {
    console.error("Image folder not found:", IMAGE_DIR);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const existingKeys = new Set(
    products.map((p) =>
      `${String(p.brand || "").toLowerCase()}__${String(p.model || "").toUpperCase()}`
    )
  );

  const files = fs
    .readdirSync(IMAGE_DIR)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const model = cleanModelFromFile(file);

    if (!model) {
      skipped++;
      continue;
    }

    const image = `/product-images/real/${brandSlug}/${file}`;
    const key = `${BRAND.replace("-", " ").toLowerCase()}__${model}`;

    const existing = products.find(
      (p) =>
        String(p.brand || "").toLowerCase() === BRAND.replace("-", " ").toLowerCase() &&
        String(p.model || "").toUpperCase() === model
    );

    if (existing) {
      if (!existing.image || String(existing.image).includes("default") || String(existing.image).includes("placeholder")) {
        existing.image = image;
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    products.push(makeProduct(BRAND, model, image));
    existingKeys.add(key);
    added++;
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("Product Expansion PRO MAX V14 finished");
  console.log("Brand:", BRAND);
  console.log("Image files:", files.length);
  console.log("Added products:", added);
  console.log("Updated existing:", updated);
  console.log("Skipped:", skipped);
  console.log("Total products:", products.length);
}

main();