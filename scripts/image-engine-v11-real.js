const fs = require("fs");
const path = require("path");
const axios = require("axios");

const PRODUCTS_PATH = path.join(process.cwd(), "data/products.json");
const OUTPUT_DIR = path.join(process.cwd(), "public/product-images/real");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ==========================
// BRAND IMAGE LIBRARY (核心)
// ==========================
const BRAND_LIBRARY = {
  "allen-bradley": "/product-images/library/ab.jpg",
  siemens: "/product-images/library/siemens.jpg",
  abb: "/product-images/library/abb.jpg",
  schneider: "/product-images/library/schneider.jpg",
  omron: "/product-images/library/omron.jpg",
  mitsubishi: "/product-images/library/mitsubishi.jpg",
};

// ==========================
// SAFE CHECK
// ==========================
function isValid(url) {
  if (!url) return false;
  if (url.includes("logo")) return false;
  if (url.includes("icon")) return false;
  return true;
}

// ==========================
// REAL IMAGE FETCH (simplified stable version)
// ==========================
async function fetchRealImage(product) {
  try {
    // 1. try product-specific direct image (if exists in data)
    if (product.image && product.image.startsWith("http")) {
      return product.image;
    }

    // 2. try official source page (if exists)
    if (product.sourcePage) {
      const res = await axios.get(product.sourcePage, { timeout: 8000 });

      const match =
        res.data.match(/og:image" content="(.*?)"/) ||
        res.data.match(/<img[^>]+src="(.*?)"/);

      if (match && isValid(match[1])) {
        return match[1];
      }
    }

    // 3. fallback brand image
    const fallback = BRAND_LIBRARY[product.brandSlug];
    if (fallback) return fallback;

    return "/product-images/library/default.jpg";
  } catch (e) {
    const fallback = BRAND_LIBRARY[product.brandSlug];
    return fallback || "/product-images/library/default.jpg";
  }
}

// ==========================
// MAIN ENGINE
// ==========================
async function run() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  let updated = 0;

  for (const p of products) {
    console.log("V11 processing:", p.brand, p.model);

    const img = await fetchRealImage(p);

    if (img) {
      p.image = img;
      updated++;
    }
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));

  console.log("V11 DONE");
  console.log("Updated:", updated);
  console.log("Total:", products.length);
}

run();