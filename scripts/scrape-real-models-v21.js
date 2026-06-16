const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const START_URL =
  process.argv[2] || "https://rfyl.en.alibaba.com/productlist.html";

const TARGET_COUNT = Number(process.argv[3] || 50);

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function detectBrand(text) {
  const brands = [
    "Siemens",
    "Allen Bradley",
    "Schneider",
    "ABB",
    "Honeywell",
    "Yokogawa",
    "Emerson",
    "Bently Nevada",
    "GE Fanuc",
    "Mitsubishi",
    "Omron",
    "Rexroth",
    "Beckhoff",
    "Keyence",
    "Danfoss",
    "Phoenix Contact",
  ];

  const lower = String(text).toLowerCase();
  return brands.find((b) => lower.includes(b.toLowerCase())) || "Industrial";
}

function detectModel(text) {
  const patterns = [
    /[A-Z0-9]{2,}[-][A-Z0-9\-\/]{2,}/i,
    /\b6ES[0-9A-Z\-]+/i,
    /\b1756-[A-Z0-9]+/i,
    /\bIC69[0-9A-Z]+/i,
    /\b[A-Z]{2,}\d{3,}[A-Z0-9\-\/]*/i,
  ];

  for (const p of patterns) {
    const m = String(text).match(p);
    if (m) return m[0].toUpperCase();
  }

  return "";
}

function cleanImage(src) {
  if (!src) return "/product-images/default-plc.png";
  if (src.startsWith("//")) return `https:${src}`;
  return src;
}

async function autoScroll(page) {
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 1200);
    await sleep(1200);
  }
}

async function collectProductLinks(page) {
  await autoScroll(page);

  return await page.evaluate(() => {
    const links = [];

    for (const a of Array.from(document.querySelectorAll("a"))) {
      const href = a.href || "";
      const text = (a.innerText || "").trim();
      const img = a.querySelector("img");

      const image =
        img?.src ||
        img?.getAttribute("data-src") ||
        img?.getAttribute("data-original") ||
        "";

      const title = text || img?.alt || "";

      if (!href) continue;

      const lower = href.toLowerCase();

      if (
        lower.includes("product-detail") ||
        lower.includes("/product/")
      ) {
        links.push({
          title,
          url: href,
          image,
        });
      }
    }

    return links;
  });
}

async function scrapeDetail(page, item) {
  try {
    await page.goto(item.url, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await sleep(4000);

    const detail = await page.evaluate(() => {
      const bodyText = document.body.innerText || "";

      const title =
        document.querySelector("h1")?.textContent ||
        document.querySelector("title")?.textContent ||
        "";

      const images = Array.from(document.querySelectorAll("img"))
        .map((img) => {
          return (
            img.src ||
            img.getAttribute("data-src") ||
            img.getAttribute("data-original") ||
            ""
          );
        })
        .filter((src) => {
          if (!src) return false;
          if (!src.startsWith("http") && !src.startsWith("//")) return false;
          if (src.includes("logo")) return false;
          if (src.includes("default")) return false;
          if (src.includes("transparent")) return false;
          return true;
        });

      return {
  title: title.trim(),
  text: bodyText.slice(0, 3000),
  image: images[0] || "",
  url: location.href
};
    });

   

const fullText =
  `${item.title} ${detail.title} ${detail.text}`;

const model = detectModel(fullText);

    if (!model) return null;

    const brand = detectBrand(fullText);
    const image = cleanImage(detail.image || item.image);

    return {
      slug: slugify(`${brand}-${model}`),
      brand,
      brandSlug: slugify(brand),
      model,
      category: "Industrial Automation Parts",
      description:
        `${brand} ${model} industrial automation spare part for PLC, DCS, HMI, control system and factory maintenance applications.`,
      image,
      sourceUrl: item.url,
    };
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log("🚀 Product Scraper PRO MAX v2.1 started");
  console.log("URL:", START_URL);
  console.log("Target:", TARGET_COUNT);
  

  const browser = await chromium.launch({
    headless: false,
    slowMo: 80,
  });

  const listPage = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  await listPage.goto(START_URL, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });

  await sleep(5000);

  const links = await collectProductLinks(listPage);

  console.log("Product detail links found:", links.length);

  const detailPage = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  const collected = [];
  const seen = new Set();

  for (const item of links) {
    if (collected.length >= TARGET_COUNT) break;

    const product = await scrapeDetail(detailPage, item);

    if (!product) continue;

    const key = `${product.brandSlug}-${product.model}`.toLowerCase();

    if (seen.has(key)) continue;
    seen.add(key);

    collected.push(product);

    console.log(
      `✅ ${collected.length}. ${product.brand} ${product.model}`
    );
  }

  await browser.close();

  let existing = [];

  if (fs.existsSync(PRODUCTS_PATH)) {
    existing = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));
  }

  const map = new Map();

  for (const p of existing) {
    const key = `${p.brandSlug || slugify(p.brand || "")}-${p.model}`.toLowerCase();
    map.set(key, p);
  }

  let imported = 0;
  let updated = 0;

  for (const p of collected) {
    const key = `${p.brandSlug}-${p.model}`.toLowerCase();

    if (map.has(key)) {
      map.set(key, {
        ...map.get(key),
        ...p,
      });
      updated++;
    } else {
      map.set(key, p);
      imported++;
    }
  }

  const finalProducts = Array.from(map.values());

  fs.writeFileSync(
    PRODUCTS_PATH,
    JSON.stringify(finalProducts, null, 2),
    "utf8"
  );

  console.log("🎉 Finished");
  console.log("Collected real models:", collected.length);
  console.log("Imported:", imported);
  console.log("Updated:", updated);
  console.log("Total products:", finalProducts.length);
}

main().catch((err) => {
  console.error("❌ Error:", err);
});