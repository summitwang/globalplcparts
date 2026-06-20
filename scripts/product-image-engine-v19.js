const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LIMIT = Number(process.argv[2] || 50);
const BASE_URL = "https://www.classicautomation.com";

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const REAL_DIR = path.join(PUBLIC_DIR, "product-images", "real");

const BRAND_SLUGS = {
  "Allen Bradley": "allen-bradley",
  ABB: "abb",
  Siemens: "siemens",
  Schneider: "schneider",
  Omron: "omron",
  Mitsubishi: "mitsubishi",
  Honeywell: "honeywell",
  Yokogawa: "yokogawa",
  Emerson: "emerson",
  "GE Fanuc": "ge-fanuc",
  "Bently Nevada": "bently-nevada",
  Foxboro: "foxboro",
  HIMA: "hima",
  Bachmann: "bachmann",
  Rexroth: "rexroth",
  ProSoft: "prosoft",
  Woodward: "woodward",
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

function localFileExists(imagePath) {
  if (!imagePath || !imagePath.startsWith("/")) return false;
  const fullPath = path.join(PUBLIC_DIR, imagePath.replace(/^\//, ""));
  return fs.existsSync(fullPath);
}

function isMissingImage(product) {
  const img = String(product.image || "").trim();

  if (!img) return true;
  if (img === "undefined" || img === "null") return true;
  if (img.includes("undefined") || img.includes("null")) return true;

  if (img.startsWith("http")) return false;

  if (img.endsWith(".svg")) return true;

  if (!localFileExists(img)) return true;

  return false;
}

function getBrandSlug(brand) {
  return BRAND_SLUGS[brand] || slugify(brand || "industrial");
}

function buildSearchUrl(product) {
  const q = encodeURIComponent(`${product.brand || ""} ${product.model || ""}`);
  return `${BASE_URL}/catalogsearch/result/?q=${q}`;
}

function isGoodImage(url) {
  const u = String(url || "").toLowerCase();

  if (!u.startsWith("http")) return false;
  if (!u.includes("/media/catalog/product/")) return false;
  if (u.endsWith(".svg")) return false;

  const bad = [
    "logo",
    "icon",
    "sprite",
    "placeholder",
    "transparent",
    "favicon",
    "banner",
    "hero",
    "social",
    "career",
    "blog",
    "warranty",
    "shipping",
    "payment",
  ];

  return !bad.some((x) => u.includes(x));
}

function scoreImage(img) {
  let score = 0;
  const u = String(img.url || "").toLowerCase();

  if (u.includes("/media/catalog/product/")) score += 100;
  if (u.includes("/cache/")) score += 30;

  score += Number(img.width || 0);
  score += Number(img.height || 0);

  if (String(img.from || "").includes("product-info-main")) score += 50;
  if (String(img.from || "").includes("product")) score += 20;

  return score;
}

async function downloadImage(url, savePath, referer) {
  const candidates = Array.from(
    new Set([makeOriginalUrl(url), normalizeUrl(url)])
  ).filter(Boolean);

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

async function extractBestImage(page, url) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(1500);

    const images = await page.evaluate(() => {
      const out = [];

      function add(src, width, height, alt, from) {
        if (!src) return;

        const first = String(src).split(",")[0].split(" ")[0];

        out.push({
          url: first,
          width: Number(width || 0),
          height: Number(height || 0),
          alt: alt || "",
          from: from || "",
        });
      }

      const selectors = [
        ".product-info-main img",
        ".product.media img",
        ".product-image-main img",
        ".product-photo img",
        ".product-image img",
        ".fotorama__img",
        ".gallery-placeholder img",
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
              img.getAttribute("data-lazy") ||
              img.src,
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            img.alt,
            selector
          );
        }

        if (out.length > 0 && selector !== "img") break;
      }

      const html = document.documentElement.innerHTML;
      const matches =
        html.match(
          /https?:\/\/[^"'\\]+\/media\/catalog\/product\/[^"'\\]+?\.(jpg|jpeg|png|webp)/gi
        ) || [];

      for (const m of matches) {
        add(m, 0, 0, "", "html-regex");
      }

      return out;
    });

    const cleanImages = images
      .map((x) => ({
        ...x,
        url: makeOriginalUrl(normalizeUrl(x.url)),
      }))
      .filter((x) => isGoodImage(x.url))
      .filter((x, index, arr) => arr.findIndex((y) => y.url === x.url) === index)
      .map((x) => ({
        ...x,
        score: scoreImage(x),
      }))
      .sort((a, b) => b.score - a.score);

    return cleanImages[0]?.url || "";
  } catch (err) {
    return "";
  }
}

async function findProductUrl(page, product) {
  const directUrls = [];

  if (product.sourceUrl && String(product.sourceUrl).startsWith("http")) {
    directUrls.push(product.sourceUrl);
  }

  const brandSlug = getBrandSlug(product.brand);
  const modelSlug = slugify(product.model);

  directUrls.push(`${BASE_URL}/parts/${brandSlug}/${modelSlug}`);

  for (const url of directUrls) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(800);

      const title = await page.evaluate(() => {
        return (
          document.querySelector("h1")?.innerText ||
          document.querySelector("title")?.innerText ||
          ""
        );
      });

      if (
        title &&
        String(title).toLowerCase().includes(String(product.model).toLowerCase().slice(0, 4))
      ) {
        return url;
      }
    } catch {}
  }

  try {
    const searchUrl = buildSearchUrl(product);

    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(1500);

    const model = String(product.model || "").toLowerCase();

    const found = await page.evaluate((model) => {
      const links = Array.from(document.querySelectorAll("a"))
        .map((a) => a.href || "")
        .filter(Boolean);

      return (
        links.find((href) =>
          href.toLowerCase().includes(model.replace(/\//g, "-"))
        ) ||
        links.find((href) => href.toLowerCase().includes(model.split("-")[0])) ||
        ""
      );
    }, model);

    return found || "";
  } catch {
    return "";
  }
}

async function main() {
  console.log("Product Image Engine PRO MAX V19 started");
  console.log("Limit:", LIMIT);

  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error("products.json not found");
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const targets = products.filter(isMissingImage).slice(0, LIMIT);

  console.log("Total products:", products.length);
  console.log("Need image fix:", products.filter(isMissingImage).length);
  console.log("This run:", targets.length);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (const product of targets) {
    const brand = product.brand || "Industrial";
    const model = product.model || "";

    if (!model) {
      skipped++;
      continue;
    }

    console.log("\nFixing:", brand, model);

    const productUrl = await findProductUrl(page, product);

    if (!productUrl) {
      console.log("No product URL found");
      failed++;
      continue;
    }

    console.log("Product URL:", productUrl);

    const imageUrl = await extractBestImage(page, productUrl);

    if (!imageUrl) {
      console.log("No image found");
      failed++;
      continue;
    }

    const brandSlug = getBrandSlug(brand);
    const brandDir = path.join(REAL_DIR, brandSlug);

    if (!fs.existsSync(brandDir)) {
      fs.mkdirSync(brandDir, { recursive: true });
    }

    const ext = imageUrl.toLowerCase().includes(".png")
      ? ".png"
      : imageUrl.toLowerCase().includes(".webp")
      ? ".webp"
      : ".jpg";

    const fileName = `${brandSlug}-${slugify(model)}${ext}`;
    const savePath = path.join(brandDir, fileName);
    const publicPath = `/product-images/real/${brandSlug}/${fileName}`;

    try {
      if (!fs.existsSync(savePath)) {
        await downloadImage(imageUrl, savePath, productUrl);
      }

      product.image = publicPath;
      product.source = "ClassicAutomation";
      product.sourceUrl = productUrl;

      fixed++;

      fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

      console.log("Fixed:", publicPath);
    } catch (err) {
      failed++;
      console.log("Download failed:", err.message);
    }
  }

  await browser.close();

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("\nV19 Image Engine Finished");
  console.log("Fixed:", fixed);
  console.log("Failed:", failed);
  console.log("Skipped:", skipped);
}

main();