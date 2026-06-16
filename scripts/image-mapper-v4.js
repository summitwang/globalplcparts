const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");

const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function fileExists(publicPath) {
  const fullPath = path.join(PUBLIC_DIR, publicPath.replace(/^\//, ""));
  return fs.existsSync(fullPath);
}

function getImagesFromBrandFolder(brand) {
  const brandSlug = slugify(brand);
  const folderPath = path.join(
    PUBLIC_DIR,
    "product-images",
    "real",
    brandSlug
  );

  if (!fs.existsSync(folderPath)) return [];

  return fs
    .readdirSync(folderPath)
    .filter((file) =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    )
    .map((file) => `/product-images/real/${brandSlug}/${file}`)
    .filter(fileExists);
}

function getFallbackImage(product) {
  const brand = String(product.brand || "");
  const brandSlug = slugify(brand);

  const fallbackMap = {
    "allen-bradley": "/product-images/real/allen-bradley/ab-control-logix.jpg",
    siemens: "/product-images/real/siemens/siemens-s7-300.jpg",
    schneider: "/product-images/real/schneider/schneider-module.jpg",
    abb: "/product-images/real/abb/abb-module.jpg",
  };

  if (fallbackMap[brandSlug] && fileExists(fallbackMap[brandSlug])) {
    return fallbackMap[brandSlug];
  }

  if (fileExists("/product-images/default-plc.png")) {
    return "/product-images/default-plc.png";
  }

  return "";
}

const brandCounters = {};
let updated = 0;
let fallback = 0;
let noImage = 0;

for (const product of products) {
  const brand = product.brand || "industrial";
  const brandSlug = slugify(brand);

  const pool = getImagesFromBrandFolder(brand);

  let newImage = "";

  if (pool.length > 0) {
    const index = brandCounters[brandSlug] || 0;
    newImage = pool[index % pool.length];
    brandCounters[brandSlug] = index + 1;
  } else {
    newImage = getFallbackImage(product);
    fallback++;
  }

  if (!newImage) {
    noImage++;
    continue;
  }

  if (product.image !== newImage) {
    product.image = newImage;
    updated++;
  }
}

fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

console.log("Product Image Mapper PRO MAX v4 finished");
console.log("Updated:", updated);
console.log("Fallback used:", fallback);
console.log("No image:", noImage);
console.log("Total:", products.length);