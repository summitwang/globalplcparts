const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const PRODUCTS_PATH = path.join(process.cwd(), "data/products.json");
const OUTPUT_DIR = path.join(process.cwd(), "public/product-images/real");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/** =========================
 * Brand Router (17 brands)
 * ========================= */
const BRAND_MAP = {
  "allen-bradley": "rockwellautomation.com",
  siemens: "siemens.com",
  abb: "new.abb.com",
  schneider: "se.com",
  omron: "omron.com",
  mitsubishi: "mitsubishielectric.com",
  yokogawa: "yokogawa.com",
  emerson: "emerson.com",
  honeywell: "honeywellprocess.com",
  "ge-fanuc": "emerson.com",
  beckhoff: "beckhoff.com",
  rexroth: "boschrexroth.com",
  "phoenix-contact": "phoenixcontact.com",
  danfoss: "danfoss.com",
  keyence: "keyence.com",
  "bently-nevada": "bently.com",
  foxboro: "schneider-electric.com"
};

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidImage(url) {
  if (!url) return false;
  if (!url.startsWith("http")) return false;
  if (url.includes("logo")) return false;
  if (url.includes("icon")) return false;
  if (url.endsWith(".svg")) return false;
  return true;
}

/** =========================
 * Download Image
 * ========================= */
async function downloadImage(url, filePath) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  fs.writeFileSync(filePath, res.data);
}

/** =========================
 * Extract Image (universal)
 * ========================= */
async function extractImage(page, url, keyword) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const images = await page.evaluate(() => {
      const list = [];

      const og =
        document.querySelector("meta[property='og:image']")?.content ||
        document.querySelector("meta[name='twitter:image']")?.content;

      if (og) list.push(og);

      document.querySelectorAll("img").forEach((img) => {
        if (img.src) list.push(img.src);
      });

      return list;
    });

    return images.find(isValidImage) || "";
  } catch {
    return "";
  }
}

/** =========================
 * Find Product Page
 * ========================= */
async function findProductPage(page, brandDomain, model) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    model + " site:" + brandDomain
  )}`;

  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a"))
        .map((a) => a.href)
        .filter(Boolean)
    );

    return links.find((l) => l.includes(brandDomain)) || "";
  } catch {
    return "";
  }
}

/** =========================
 * MAIN
 * ========================= */
async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const page = await browser.newPage();

  let updated = 0;
  let failed = 0;

  for (const product of products) {
    const brandSlug = product.brandSlug;
    const domain = BRAND_MAP[brandSlug];

    if (!domain) continue;

    const fileName = `${slugify(product.brand)}-${slugify(product.model)}.jpg`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    const publicPath = `/product-images/real/${fileName}`;

    if (fs.existsSync(filePath)) {
      product.image = publicPath;
      continue;
    }

    console.log(`Searching: ${product.brand} ${product.model}`);

    const productPage = await findProductPage(page, domain, product.model);

    if (!productPage) {
      failed++;
      continue;
    }

    const imageUrl = await extractImage(page, productPage, product.model);

    if (!imageUrl) {
      failed++;
      continue;
    }

    try {
      await downloadImage(imageUrl, filePath);

      product.image = publicPath;
      product.imageSource = imageUrl;
      product.sourcePage = productPage;

      updated++;

      console.log("Updated:", product.model);
    } catch (e) {
      failed++;
    }
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));

  await browser.close();

  console.log("\nDONE");
  console.log("Updated:", updated);
  console.log("Failed:", failed);
  console.log("Total:", products.length);
}

main();