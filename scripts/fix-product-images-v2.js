const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");

const brandImages = {
  siemens: "/product-images/siemens-plc.svg",
  abb: "/product-images/abb-plc.svg",
  "allen-bradley": "/product-images/allen-bradley-plc.svg",
  schneider: "/product-images/schneider-plc.svg",
  honeywell: "/product-images/honeywell-plc.svg",
  yokogawa: "/product-images/yokogawa-plc.svg",
  emerson: "/product-images/emerson-plc.svg",
  "ge-fanuc": "/product-images/ge-fanuc-plc.svg",
  mitsubishi: "/product-images/mitsubishi-plc.svg",
  omron: "/product-images/omron-plc.svg",
  rexroth: "/product-images/default-plc.png",
  beckhoff: "/product-images/default-plc.png",
  keyence: "/product-images/default-plc.png",
  danfoss: "/product-images/default-plc.png",
  industrial: "/product-images/default-plc.png",
};

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isBadImage(image) {
  if (!image) return true;

  const img = String(image).toLowerCase();

  if (img.includes("default-plc")) return true;
  if (img.includes("alicdn.com/@img")) return true;
  if (img.includes("imgextra") && img.includes(".svg")) return true;
  if (img.includes("logo")) return true;
  if (img.includes("transparent")) return true;

  return false;
}

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  let fixed = 0;

  for (const p of products) {
    if (!isBadImage(p.image)) continue;

    const brandSlug = p.brandSlug || slugify(p.brand);
    const fallback =
      brandImages[brandSlug] ||
      "/product-images/default-plc.png";

    p.image = fallback;
    fixed++;
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("Product Image PRO MAX v2 finished");
  console.log("Fixed images:", fixed);
  console.log("Total products:", products.length);
}

main();