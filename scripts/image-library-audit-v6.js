const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const REAL_DIR = path.join(process.cwd(), "public", "product-images", "real");
const OUT_PATH = path.join(process.cwd(), "data", "image-library-needed.json");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

const stats = {};

for (const p of products) {
  const brand = p.brand || "Industrial";
  const slug = p.brandSlug || slugify(brand);

  if (!stats[slug]) {
    stats[slug] = {
      brand,
      brandSlug: slug,
      products: 0,
      images: 0,
      folder: `/product-images/real/${slug}`,
      needImages: 0,
      status: "",
    };
  }

  stats[slug].products++;
}

for (const slug of Object.keys(stats)) {
  const folderPath = path.join(REAL_DIR, slug);

  let images = 0;

  if (fs.existsSync(folderPath)) {
    images = fs
      .readdirSync(folderPath)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).length;
  }

  stats[slug].images = images;

  if (images === 0) {
    stats[slug].status = "EMPTY";
    stats[slug].needImages = Math.min(20, Math.max(5, Math.ceil(stats[slug].products / 10)));
  } else if (images < 5) {
    stats[slug].status = "LOW";
    stats[slug].needImages = 5 - images;
  } else {
    stats[slug].status = "OK";
    stats[slug].needImages = 0;
  }
}

const result = Object.values(stats).sort((a, b) => b.products - a.products);

fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), "utf8");

console.log("Product Image Library Audit v6 finished");
console.table(result);
console.log("Saved to:", OUT_PATH);