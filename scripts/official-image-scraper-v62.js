const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LIMIT = Number(process.argv[2] || 10);
const BRAND_FILTER = process.argv[3] || "Allen Bradley";

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const OUTPUT_DIR = path.join(process.cwd(), "public", "product-images", "models");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const officialDomains = {
  "Allen Bradley": ["rockwellautomation.com"],
  Siemens: ["siemens.com"],
  Schneider: ["se.com", "schneider-electric.com"],
  ABB: ["abb.com"],
  Honeywell: ["honeywell.com"],
  Yokogawa: ["yokogawa.com"],
  Emerson: ["emerson.com"],
  Omron: ["omron.com"],
  Mitsubishi: ["mitsubishielectric.com"],
  "GE Fanuc": ["ge.com"],
  "Bently Nevada": ["bently.com", "bentlynevada.com", "bakerhughes.com"],
  Foxboro: ["se.com"],
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

function isOfficialUrl(url, domains) {
  const lower = String(url || "").toLowerCase();
  return domains.some((d) => lower.includes(d));
}

function isBadImage(url) {
  const lower = String(url || "").toLowerCase();

  if (!lower.startsWith("http")) return true;
  if (lower.includes("logo")) return true;
  if (lower.includes("icon")) return true;
  if (lower.includes("sprite")) return true;
  if (lower.includes("transparent")) return true;
  if (lower.includes("base64")) return true;
  if (lower.endsWith(".svg")) return true;
  if (lower.includes("favicon")) return true;

  return false;
}

async function downloadImage(url, savePath) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.google.com/",
    },
  });

  if (!res.data || res.data.length < 5000) {
    throw new Error("Image file too small, skipped");
  }

  fs.writeFileSync(savePath, res.data);
}

async function findOfficialPages(page, product, domains) {
  const domainQuery = domains.map((d) => `site:${d}`).join(" OR ");
  const query = `${product.brand} ${product.model} product ${domainQuery}`;

  const searchUrl =
    "https://www.google.com/search?q=" + encodeURIComponent(query);

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter(Boolean);
  });

  return links
    .filter((url) => isOfficialUrl(url, domains))
    .filter((url) => !url.includes("/search"))
    .filter((url, index, arr) => arr.indexOf(url) === index)
    .slice(0, 5);
}

async function extractOfficialImage(page, url, domains) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const images = await page.evaluate(() => {
      const result = [];

      const og =
        document.querySelector("meta[property='og:image']")?.getAttribute("content") ||
        document.querySelector("meta[name='twitter:image']")?.getAttribute("content");

      if (og) result.push(og);

      const imgs = Array.from(document.querySelectorAll("img"));

      for (const img of imgs) {
        const src =
          img.src ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-original") ||
          img.getAttribute("srcset") ||
          "";

        if (src) result.push(src.split(" ")[0]);
      }

      return result;
    });

    const cleanImages = images
      .filter((img) => !isBadImage(img))
      .filter((img) => isOfficialUrl(img, domains));

    return cleanImages[0] || "";
  } catch {
    return "";
  }
}

async function main() {
  console.log("Official Website Image Scraper PRO MAX v6.2 started");
  console.log("Brand:", BRAND_FILTER);
  console.log("Limit:", LIMIT);

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const targetProducts = products.filter(
    (p) =>
      String(p.brand || "").toLowerCase() ===
      String(BRAND_FILTER).toLowerCase()
  );

  const domains = officialDomains[BRAND_FILTER];

  if (!domains) {
    console.error("No official domains configured for:", BRAND_FILTER);
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 80,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  for (const product of targetProducts) {
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
      console.log("\nSearching official:", product.brand, product.model);

      const officialPages = await findOfficialPages(page, product, domains);

      if (!officialPages.length) {
        console.log("No official page found:", product.model);
        failed++;
        continue;
      }

      let imageUrl = "";

      for (const officialPage of officialPages) {
        console.log("Checking:", officialPage);

        imageUrl = await extractOfficialImage(page, officialPage, domains);

        if (imageUrl) break;
      }

      if (!imageUrl) {
        console.log("No official image found:", product.model);
        failed++;
        continue;
      }

      await downloadImage(imageUrl, savePath);

      product.image = publicPath;
      product.imageSourceUrl = imageUrl;

      downloaded++;

      console.log("Downloaded:", publicPath);
    } catch (err) {
      console.log("Failed:", product.model, err.message);
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