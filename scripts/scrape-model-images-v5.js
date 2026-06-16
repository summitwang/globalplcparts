const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LIMIT = Number(process.argv[2] || 30);

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const OUTPUT_DIR = path.join(process.cwd(), "public", "product-images", "models");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidImageUrl(url) {
  if (!url) return false;

  const lower = String(url).toLowerCase();

  if (!lower.startsWith("http")) return false;
  if (lower.includes("logo")) return false;
  if (lower.includes("icon")) return false;
  if (lower.includes("sprite")) return false;
  if (lower.includes("base64")) return false;
  if (lower.includes("transparent")) return false;
  if (lower.endsWith(".svg")) return false;

  return true;
}

async function downloadImage(url, savePath) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Referer: "https://www.google.com/",
    },
  });

  fs.writeFileSync(savePath, res.data);
}

async function searchImage(page, product) {
  const query = `${product.brand} ${product.model} PLC module product image`;
  const searchUrl =
    "https://www.bing.com/images/search?q=" + encodeURIComponent(query);

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  const images = await page.evaluate(() => {
    const results = [];

    const imgTags = Array.from(document.querySelectorAll("img"));

    for (const img of imgTags) {
      const src =
        img.src ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        "";

      if (src) {
        results.push(src);
      }
    }

    return results;
  });

  return images.find(isValidImageUrl) || "";
}

async function main() {
  console.log("🚀 Product Image Scraper PRO MAX v5 started");
  console.log("Limit:", LIMIT);

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 80,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    if (downloaded >= LIMIT) break;

    const fileName = `${slugify(product.brand)}-${slugify(product.model)}.jpg`;
    const savePath = path.join(OUTPUT_DIR, fileName);
    const publicPath = `/product-images/models/${fileName}`;

    if (fs.existsSync(savePath)) {
      product.image = publicPath;
      skipped++;
      continue;
    }

    try {
      console.log("Searching:", product.brand, product.model);

      const imageUrl = await searchImage(page, product);

      if (!imageUrl) {
        console.log("No image found:", product.model);
        failed++;
        continue;
      }

      await downloadImage(imageUrl, savePath);

      product.image = publicPath;
      downloaded++;

      console.log("✅ Downloaded:", publicPath);
    } catch (err) {
      console.log("❌ Failed:", product.model, err.message);
      failed++;
    }
  }

  await browser.close();

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("Finished");
  console.log("Downloaded:", downloaded);
  console.log("Skipped existing:", skipped);
  console.log("Failed:", failed);
  console.log("Total products:", products.length);
}

main();