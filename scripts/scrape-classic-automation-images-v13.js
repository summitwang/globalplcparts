const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const TARGET_BRAND = process.argv[2] || "Allen-Bradley";
const LIMIT = Number(process.argv[3] || 80);
const MAX_PAGES = Number(process.argv[4] || 10);
const START_CATEGORY_URL = process.argv[5] || "";

const BASE_URL = "https://www.classicautomation.com";
const REAL_DIR = path.join(process.cwd(), "public", "product-images", "real");
const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const brandSlug = slugify(TARGET_BRAND);
const BRAND_DIR = path.join(REAL_DIR, brandSlug);

if (!fs.existsSync(BRAND_DIR)) fs.mkdirSync(BRAND_DIR, { recursive: true });

const PLC_PATTERNS = [
  /^1756-/i,
  /^1769-/i,
  /^1783-/i,
  /^1746-/i,
  /^1747-/i,
  /^1771-/i,
  /^2711-/i,
  /^2711p-/i,
  /^2711t-/i,
  /^1762-/i,
  /^1764-/i,
  /^1734-/i,
  /^1794-/i,
  /^20-/i,
  /^22-/i,
];

function getModelFromUrl(url) {
  return String(url || "")
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(/\.html$/i, "")
    .toUpperCase();
}

function isTargetPLCModel(model) {
  return PLC_PATTERNS.some((r) => r.test(model));
}

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE_URL + url;
  return url;
}

function makeOriginalUrl(url) {
  const u = normalizeUrl(url);

  if (u.includes("/media/catalog/product/cache/")) {
    const parts = u.split("/media/catalog/product/cache/");
    if (parts.length === 2) {
      const rest = parts[1].split("/");
      if (rest.length > 1) {
        rest.shift();
        return parts[0] + "/media/catalog/product/" + rest.join("/");
      }
    }
  }

  return u;
}

function isProductImage(url) {
  const u = String(url || "").toLowerCase();

  if (!u.startsWith("http")) return false;
  if (!u.includes("/media/catalog/product/")) return false;

  const badWords = [
    "logo", "icon", "sprite", "placeholder", "transparent", "favicon",
    "banner", "hero", "background", "social", "people", "person",
    "office", "career", "blog", "payment", "warranty", "guarantee",
    "fragile", "shipping", "tracking", "classic-logo", "bat.bing",
    "2-year", "year-warranty", "box", "carton", "package"
  ];

  if (u.endsWith(".svg")) return false;
  if (u.includes("data:image")) return false;

  return !badWords.some((word) => u.includes(word));
}

async function downloadImage(url, savePath, referer) {
  const candidates = Array.from(new Set([makeOriginalUrl(url), normalizeUrl(url)]));

  let lastError = "";

  for (const candidate of candidates) {
    try {
      const res = await axios.get(candidate, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: referer || BASE_URL,
        },
      });

      if (!res.data || res.data.length < 2500) {
        lastError = "Image too small";
        continue;
      }

      fs.writeFileSync(savePath, res.data);
      return candidate;
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(lastError || "Download failed");
}

async function autoScroll(page) {
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(600);
  }
}

async function collectProductLinksOnPage(page, url) {
  console.log("Scanning list page:", url);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
    await autoScroll(page);

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a"))
        .map((a) => a.href || "")
        .filter(Boolean)
    );

    return links
      .filter((href) => {
        const lower = href.toLowerCase();

        if (!lower.startsWith("https://www.classicautomation.com/")) return false;
    
        if (lower.includes("/media/")) return false;
        if (lower.includes("/customer/")) return false;
        if (lower.includes("/checkout/")) return false;
        if (lower.includes("/catalogsearch/")) return false;
        if (lower.includes("#")) return false;

        const model = getModelFromUrl(href);

return isTargetPLCModel(model);
      })
      .map((href) => href.split("?")[0])
      .filter((href, index, arr) => arr.indexOf(href) === index);
  } catch (err) {
    console.log("List page failed:", err.message);
    return [];
  }
}

async function findNextPageUrl(page) {
  return await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));

    const next = links.find((a) => {
      const t = (a.innerText || "").trim().toLowerCase();
      const cls = String(a.className || "").toLowerCase();
      return t === "next" || t.includes("next") || cls.includes("next");
    });

    return next?.href || "";
  });
}

async function scanCategoryWithPagination(page, startUrl) {
  const productLinks = [];
  const visited = new Set();
  let currentUrl = startUrl;

  for (let i = 1; i <= MAX_PAGES; i++) {
    if (!currentUrl || visited.has(currentUrl)) break;

    visited.add(currentUrl);

    const links = await collectProductLinksOnPage(page, currentUrl);
    console.log("PLC product links on page:", links.length);

    productLinks.push(...links);

    if (productLinks.length >= LIMIT * 3) break;

    const nextUrl = await findNextPageUrl(page);
    if (!nextUrl || visited.has(nextUrl)) break;

    currentUrl = nextUrl;
  }

  return productLinks;
}

async function extractImageFromProductPage(page, productUrl) {
  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);

    const images = await page.evaluate(() => {
      const out = [];

      function add(src, width, height, alt) {
        if (!src) return;
        const first = String(src).split(",")[0].split(" ")[0];

        out.push({
          url: first,
          width: Number(width || 0),
          height: Number(height || 0),
          alt: alt || "",
        });
      }

      const selectors = [
        ".fotorama__img",
        ".gallery-placeholder img",
        ".product.media img",
        ".product-image-main img",
        ".product-info-main img",
        "img",
      ];

      for (const selector of selectors) {
        const imgs = Array.from(document.querySelectorAll(selector));

        for (const img of imgs) {
          add(
            img.getAttribute("data-zoom-image") ||
              img.getAttribute("data-large-image") ||
              img.getAttribute("data-full") ||
              img.getAttribute("data-original") ||
              img.getAttribute("data-src") ||
              img.src,
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            img.alt
          );

          const srcset = img.getAttribute("srcset");
          if (srcset) add(srcset, img.naturalWidth || img.width, img.naturalHeight || img.height, img.alt);
        }

        if (out.length > 0 && selector !== "img") break;
      }

      for (const a of Array.from(document.querySelectorAll("a"))) {
        const href = a.href || "";
        if (href.includes("/media/catalog/product/")) add(href, 0, 0, "");
      }

      return out;
    });

    const clean = images
      .map((x) => ({ ...x, url: makeOriginalUrl(normalizeUrl(x.url)) }))
      .filter((x) => isProductImage(x.url))
      .filter((x) => {
        const w = x.width;
        const h = x.height;

        if (w && h) {
          if (w < 60 || h < 60) return false;
          if (w > h * 4) return false;
          if (h > w * 4) return false;
        }

        return true;
      });

    return clean[0]?.url || "";
  } catch (err) {
    console.log("Product page failed:", err.message);
    return "";
  }
}

function updateProductsJson(model, publicPath) {
  if (!fs.existsSync(PRODUCTS_PATH)) return false;

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  let changed = false;

  for (const p of products) {
    if (
      String(p.brand || "").toLowerCase().includes("allen") &&
      String(p.model || "").toUpperCase() === model.toUpperCase()
    ) {
      p.image = publicPath;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));
  }

  return changed;
}

async function main() {
  console.log("Classic Automation V13.3 PLC Module Only started");
  console.log("Brand:", TARGET_BRAND);
  console.log("Limit:", LIMIT);
  console.log("Max pages:", MAX_PAGES);
  console.log("Category:", START_CATEGORY_URL);

  if (!START_CATEGORY_URL) {
    console.log("Please provide category URL.");
    console.log('Example: npm run scrape-classic-detail-images -- "Allen-Bradley" 80 10 "https://www.classicautomation.com/parts/allen-bradley/allen-bradley-controllogix"');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const productLinks = await scanCategoryWithPagination(page, START_CATEGORY_URL);

  const uniqueProductLinks = productLinks.filter(
    (url, index, arr) => arr.indexOf(url) === index
  );

  console.log("Unique PLC product links:", uniqueProductLinks.length);

  let downloaded = 0;
  let failed = 0;
  let duplicate = 0;
  let jsonUpdated = 0;

  const seenImages = new Set();

  for (const productUrl of uniqueProductLinks) {
    if (downloaded >= LIMIT) break;

    const model = getModelFromUrl(productUrl);

    console.log("Product detail:", model, productUrl);

    const imageUrl = await extractImageFromProductPage(page, productUrl);

    if (!imageUrl) {
      failed++;
      continue;
    }

    if (seenImages.has(imageUrl)) {
      duplicate++;
      continue;
    }

    seenImages.add(imageUrl);

    const ext = imageUrl.toLowerCase().includes(".png")
      ? ".png"
      : imageUrl.toLowerCase().includes(".webp")
      ? ".webp"
      : ".jpg";

    const fileName = `${brandSlug}-${slugify(model)}${ext}`;
    const savePath = path.join(BRAND_DIR, fileName);
    const publicPath = `/product-images/real/${brandSlug}/${fileName}`;

    if (fs.existsSync(savePath)) {
      duplicate++;
      const updated = updateProductsJson(model, publicPath);
      if (updated) jsonUpdated++;
      continue;
    }

    try {
      const finalUrl = await downloadImage(imageUrl, savePath, productUrl);
      downloaded++;

      const updated = updateProductsJson(model, publicPath);
      if (updated) jsonUpdated++;

      console.log("Saved:", publicPath);
      console.log("Source:", finalUrl);
      console.log("products.json updated:", updated ? "YES" : "NO MATCH");
    } catch (err) {
      failed++;
      console.log("Failed:", err.message);
    }
  }

  await browser.close();

  console.log("Finished");
  console.log("Downloaded:", downloaded);
  console.log("Failed:", failed);
  console.log("Duplicate skipped:", duplicate);
  console.log("products.json updated:", jsonUpdated);
  console.log("Folder:", `/product-images/real/${brandSlug}`);
}

main();