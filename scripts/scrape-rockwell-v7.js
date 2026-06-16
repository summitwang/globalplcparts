const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LIMIT = Number(process.argv[2] || 5);

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

function isGoodImage(url) {
  const u = String(url || "").toLowerCase();

  if (!u.startsWith("http")) return false;
  if (!u.includes("rockwellautomation")) return false;
  if (u.includes("logo")) return false;
  if (u.includes("icon")) return false;
  if (u.includes("sprite")) return false;
  if (u.includes("transparent")) return false;
  if (u.includes("favicon")) return false;
  if (u.endsWith(".svg")) return false;

  return true;
}

async function downloadImage(url, savePath) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.rockwellautomation.com/",
    },
  });

  if (!res.data || res.data.length < 5000) {
    throw new Error("Image too small");
  }

  fs.writeFileSync(savePath, res.data);
}

async function findRockwellPage(page, model) {
  const searchUrls = [
    `https://www.rockwellautomation.com/search/ra-en-US;keyword=${encodeURIComponent(model)}`,
    `https://www.rockwellautomation.com/en-us/search.html?q=${encodeURIComponent(model)}`,
    `https://www.rockwellautomation.com/en-us/products/details.${encodeURIComponent(model)}.html`,
  ];

  for (const url of searchUrls) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForTimeout(3000);

      const bodyText = await page.evaluate(() => document.body.innerText || "");

      if (!bodyText.toLowerCase().includes(model.toLowerCase())) {
        continue;
      }

      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a"))
          .map((a) => a.href)
          .filter(Boolean)
      );

      const productLink = links.find(
        (href) =>
          href.toLowerCase().includes("rockwellautomation.com") &&
          href.toLowerCase().includes(model.toLowerCase().replace("-", ""))
      );

      if (productLink) return productLink;

      return page.url();
    } catch {
      continue;
    }
  }

  return "";
}

async function extractImageFromPage(page, url, model) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const bodyText = await page.evaluate(() => document.body.innerText || "");

    if (!bodyText.toLowerCase().includes(model.toLowerCase())) {
      return "";
    }

    const images = await page.evaluate(() => {
      const result = [];

      const og =
        document.querySelector("meta[property='og:image']")?.getAttribute("content") ||
        document.querySelector("meta[name='twitter:image']")?.getAttribute("content");

      if (og) result.push(og);

      for (const img of Array.from(document.querySelectorAll("img"))) {
        const src =
          img.src ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-original") ||
          "";

        if (src) result.push(src);
      }

      return result;
    });

    return images.find(isGoodImage) || "";
  } catch {
    return "";
  }
}

async function main() {
  console.log("Product Image Scraper PRO MAX v7 - Rockwell started");
  console.log("Limit:", LIMIT);

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const targets = products.filter(
    (p) => String(p.brand || "").toLowerCase() === "allen bradley"
  );

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

  for (const product of targets) {
    if (downloaded >= LIMIT) break;

    const model = product.model;
    const fileName = `allen-bradley-${slugify(model)}.jpg`;
    const savePath = path.join(OUTPUT_DIR, fileName);
    const publicPath = `/product-images/models/${fileName}`;

    if (fs.existsSync(savePath)) {
      product.image = publicPath;
      skipped++;
      continue;
    }

    try {
      console.log("\nSearching Rockwell:", model);

      const productPage = await findRockwellPage(page, model);

      if (!productPage) {
        console.log("No Rockwell page:", model);
        failed++;
        continue;
      }

      console.log("Product page:", productPage);

      const imageUrl = await extractImageFromPage(page, productPage, model);

      if (!imageUrl) {
        console.log("No official image:", model);
        failed++;
        continue;
      }

      await downloadImage(imageUrl, savePath);

      product.image = publicPath;
      product.imageSourceUrl = imageUrl;
      product.imageSourcePage = productPage;

      downloaded++;

      console.log("Downloaded:", publicPath);
    } catch (err) {
      console.log("Failed:", model, err.message);
      failed++;
    }
  }

  await browser.close();

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("\nFinished");
  console.log("Downloaded:", downloaded);
  console.log("Skipped existing:", skipped);
  console.log("Failed:", failed);
  console.log("Total products:", products.length);
}

main();