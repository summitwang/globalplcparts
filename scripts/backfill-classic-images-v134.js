const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const BRAND = process.argv[2] || "Allen-Bradley";

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

function normalizeModel(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/\.(JPG|JPEG|PNG|WEBP)$/i, "")
    .replace(/^ALLEN-BRADLEY-/i, "")
    .replace(/^AB-/i, "")
    .replace(/^ROCKWELL-/i, "")
    .replace(/^CLASSIC-/i, "")
    .replace(/-CLASSIC-DETAIL-\d+-/i, "")
    .replace(/-CLASSIC-\d+-/i, "")
    .replace(/-(A|B|C|D|E|F|G|H|J|K|L|M|N|P|R|S|T|U|V|W|X|Y|Z)$/i, "")
    .trim();
}

function modelVariants(model) {
  const base = normalizeModel(model);

  return Array.from(
    new Set([
      base,
      base.replace(/-/g, ""),
      base.replace(/\s+/g, ""),
      base.replace(/-0+/, "-"),
    ])
  );
}

function isBetterImage(oldImage, newImage) {
  if (!oldImage) return true;

  const oldLower = String(oldImage).toLowerCase();

  if (oldLower.includes("default")) return true;
  if (oldLower.includes("placeholder")) return true;
  if (oldLower.includes("brand")) return true;
  if (oldLower.includes("library")) return true;
  if (oldLower.includes("rockwellautomation.scene7")) return true;

  return false;
}

function main() {
  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error("products.json not found:", PRODUCTS_PATH);
    process.exit(1);
  }

  if (!fs.existsSync(IMAGE_DIR)) {
    console.error("Image folder not found:", IMAGE_DIR);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const files = fs
    .readdirSync(IMAGE_DIR)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  const imageMap = new Map();

  for (const file of files) {
    const cleanModel = normalizeModel(file);

    for (const v of modelVariants(cleanModel)) {
      if (!imageMap.has(v)) {
        imageMap.set(v, `/product-images/real/${brandSlug}/${file}`);
      }
    }
  }

  let updated = 0;
  let matched = 0;
  let skipped = 0;

  for (const p of products) {
    const pBrand = String(p.brand || "").toLowerCase();

    if (
      !pBrand.includes("allen") &&
      !pBrand.includes("rockwell") &&
      brandSlug === "allen-bradley"
    ) {
      continue;
    }

    const variants = modelVariants(p.model);

    let newImage = "";

    for (const v of variants) {
      if (imageMap.has(v)) {
        newImage = imageMap.get(v);
        break;
      }
    }

    if (!newImage) continue;

    matched++;

    if (isBetterImage(p.image, newImage)) {
      p.image = newImage;
      updated++;
    } else {
      skipped++;
    }
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("Classic Image Backfill V13.4 finished");
  console.log("Brand:", BRAND);
  console.log("Image files:", files.length);
  console.log("Matched products:", matched);
  console.log("Updated products:", updated);
  console.log("Skipped existing good images:", skipped);
}

main();