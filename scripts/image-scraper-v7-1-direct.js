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
 * DIRECT BRAND ROUTER
 * ========================= */
const BRAND_ROUTER = {
  "allen-bradley": (m) =>
    `https://www.rockwellautomation.com/en-us/products/details.${m}.html`,

  siemens: (m) =>
    `https://mall.industry.siemens.com/mall/en/WW/Catalog/Product/${m}`,

  abb: (m) =>
    `https://new.abb.com/products/${m}`,

  schneider: (m) =>
    `https://www.se.com/ww/en/product/${m}`,

  omron: (m) =>
    `https://www.ia.omron.com/products/family/${m}/`,

  mitsubishi: (m) =>
    `https://www.mitsubishielectric.com/fa/products/${m}`,

  yokogawa: (m) =>
    `https://www.yokogawa.com/products/${m}`,

  emerson: (m) =>
    `https://www.emerson.com/en-us/catalog/${m}`,

  honeywell: (m) =>
    `https://process.honeywell.com/us/en/products/${m}`,

  beckhoff: (m) =>
    `https://www.beckhoff.com/en-us/products/${m}`,

  rexroth: (m) =>
    `https://www.boschrexroth.com/en/xc/products/${m}`,

  "phoenix-contact": (m) =>
    `https://www.phoenixcontact.com/en-pc/products/${m}`,

  danfoss: (m) =>
    `https://www.danfoss.com/en/products/${m}`,

  keyence: (m) =>
    `https://www.keyence.com/products/${m}`,

  "bently-nevada": (m) =>
    `https://www.bakerhughes.com/bently-nevada/${m}`,

  foxboro: (m) =>
    `https://www.se.com/ww/en/work/products/foxboro/${m}`
};

/** ========================= */
function slugify(t) {
  return String(t)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValid(img) {
  if (!img) return false;
  if (!img.startsWith("http")) return false;
  if (img.includes("logo")) return false;
  if (img.includes("icon")) return false;
  if (img.endsWith(".svg")) return false;
  return true;
}

/** ========================= */
async function download(url, file) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  fs.writeFileSync(file, res.data);
}

/** ========================= */
async function extract(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const images = await page.evaluate(() => {
      const out = [];

      const og =
        document.querySelector("meta[property='og:image']")?.content ||
        document.querySelector("meta[name='twitter:image']")?.content;

      if (og) out.push(og);

      document.querySelectorAll("img").forEach((i) => {
        if (i.src) out.push(i.src);
      });

      return out;
    });

    return images.find(isValid) || "";
  } catch {
    return "";
  }
}

/** ========================= */
async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40
  });

  const page = await browser.newPage();

  let updated = 0;
  let failed = 0;

  for (const p of products) {
    const fn = BRAND_ROUTER[p.brandSlug];

    if (!fn) continue;

    const url = fn(p.model);

    const fileName = `${slugify(p.brand)}-${slugify(p.model)}.jpg`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    const publicPath = `/product-images/real/${fileName}`;

    if (fs.existsSync(filePath)) {
      p.image = publicPath;
      continue;
    }

    console.log("DIRECT:", p.brand, p.model);

    const imageUrl = await extract(page, url);

    if (!imageUrl) {
      failed++;
      continue;
    }

    try {
      await download(imageUrl, filePath);

      p.image = publicPath;
      p.imageSource = imageUrl;
      p.sourcePage = url;

      updated++;

      console.log("OK:", p.model);
    } catch {
      failed++;
    }
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));

  await browser.close();

  console.log("\nDONE");
  console.log("Updated:", updated);
  console.log("Failed:", failed);
}
main();