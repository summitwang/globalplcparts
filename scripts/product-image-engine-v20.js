const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LIMIT = Number(process.argv[2] || 100);
const BASE_URL = "https://www.classicautomation.com";

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const REAL_DIR = path.join(PUBLIC_DIR, "product-images", "real");
const CACHE_PATH = path.join(process.cwd(), "data", "image-cache-v20.json");
const STATE_PATH = path.join(process.cwd(), "data", "image-state-v20.json");

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

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
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

function getBrandSlug(brand) {
  return BRAND_SLUGS[brand] || slugify(brand || "industrial");
}

function localFileExists(imagePath) {
  if (!imagePath || !imagePath.startsWith("/")) return false;
  const fullPath = path.join(PUBLIC_DIR, imagePath.replace(/^\//, ""));
  return fs.existsSync(fullPath);
}

function needsImageFix(product) {
  const img = String(product.image || "").trim();
  if (!img) return true;
  if (img === "undefined" || img === "null") return true;
  if (img.includes("undefined") || img.includes("null")) return true;
  if (img.endsWith(".svg")) return true;
  if (img.startsWith("http")) return true;
  if (!localFileExists(img)) return true;
  return false;
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

  if (String(img.from || "").includes("product-info-main")) score += 80;
  if (String(img.from || "").includes("product")) score += 30;

  return score;
}

async function isRemoteImageAlive(url) {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: () => true,
    });

    const type = String(res.headers["content-type"] || "").toLowerCase();

    if (res.status < 200 || res.status >= 300) return false;
    if (!type.includes("image")) return false;
    if (!res.data || res.data.length < 2500) return false;

    return true;
  } catch {
    return false;
  }
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

      const type = String(res.headers["content-type"] || "").toLowerCase();

      if (!type.includes("image")) {
        lastError = "Not image";
        continue;
      }

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

async function extractImagesFromPage(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
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

          const srcset = img.getAttribute("srcset");
          if (srcset) {
            const best = srcset
              .split(",")
              .map((x) => x.trim())
              .map((x) => {
                const parts = x.split(/\s+/);
                return { url: parts[0], size: parseInt(parts[1] || "0", 10) || 0 };
              })
              .sort((a, b) => b.size - a.size)[0];

            if (best?.url) {
              add(best.url, img.naturalWidth || img.width, img.naturalHeight || img.height, img.alt, `${selector} srcset`);
            }
          }
        }
      }

      const html = document.documentElement.innerHTML;
      const matches =
        html.match(/https?:\/\/[^"'\\]+\/media\/catalog\/product\/[^"'\\]+?\.(jpg|jpeg|png|webp)/gi) || [];

      for (const m of matches) add(m, 0, 0, "", "html-regex");

      return out;
    });

    return images
      .map((x) => ({ ...x, url: makeOriginalUrl(normalizeUrl(x.url)) }))
      .filter((x) => isGoodImage(x.url))
      .filter((x, i, arr) => arr.findIndex((y) => y.url === x.url) === i)
      .map((x) => ({ ...x, score: scoreImage(x) }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

async function findProductUrl(page, product) {
  const brandSlug = getBrandSlug(product.brand);
  const model = String(product.model || "");
  const modelSlug = slugify(model);

  const candidates = [];

  if (product.sourceUrl && String(product.sourceUrl).startsWith("http")) {
    candidates.push(product.sourceUrl);
  }

  candidates.push(`${BASE_URL}/parts/${brandSlug}/${modelSlug}`);

  for (const url of candidates) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(800);

      const title = await page.evaluate(() => {
        return (
          document.querySelector("h1")?.innerText ||
          document.querySelector("title")?.innerText ||
          ""
        );
      });

      if (
        String(title).toLowerCase().includes(model.toLowerCase().slice(0, 4))
      ) {
        return url;
      }
    } catch {}
  }

  try {
    const q = encodeURIComponent(`${product.brand || ""} ${model}`);
    const searchUrl = `${BASE_URL}/catalogsearch/result/?q=${q}`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);

    const found = await page.evaluate((model) => {
      const m = String(model || "").toLowerCase();
      const mSlug = m.replace(/\//g, "-");

      const links = Array.from(document.querySelectorAll("a"))
        .map((a) => a.href || "")
        .filter(Boolean);

      return (
        links.find((href) => href.toLowerCase().includes(mSlug)) ||
        links.find((href) => href.toLowerCase().includes(m.split("-")[0])) ||
        ""
      );
    }, model);

    return found || "";
  } catch {
    return "";
  }
}

function makeSavePath(product, imageUrl) {
  const brandSlug = getBrandSlug(product.brand);
  const brandDir = path.join(REAL_DIR, brandSlug);

  if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

  const ext = imageUrl.toLowerCase().includes(".png")
    ? ".png"
    : imageUrl.toLowerCase().includes(".webp")
    ? ".webp"
    : ".jpg";

  const fileName = `${brandSlug}-${slugify(product.model)}${ext}`;
  const savePath = path.join(brandDir, fileName);
  const publicPath = `/product-images/real/${brandSlug}/${fileName}`;

  return { savePath, publicPath };
}

async function recoverImage(page, product, cache) {
  const key = `${product.brand || ""}::${product.model || ""}`;

  if (cache[key]?.publicPath && localFileExists(cache[key].publicPath)) {
    return {
      ok: true,
      publicPath: cache[key].publicPath,
      source: cache[key].source || "cache",
      score: cache[key].score || 0,
    };
  }

  const productUrl = await findProductUrl(page, product);

  if (!productUrl) {
    return { ok: false, reason: "no-product-url" };
  }

  const images = await extractImagesFromPage(page, productUrl);

  for (const img of images) {
    const alive = await isRemoteImageAlive(img.url);
    if (!alive) continue;

    const { savePath, publicPath } = makeSavePath(product, img.url);

    try {
      if (!fs.existsSync(savePath)) {
        await downloadImage(img.url, savePath, productUrl);
      }

      cache[key] = {
        publicPath,
        source: "ClassicAutomation",
        sourceUrl: productUrl,
        remoteUrl: img.url,
        score: img.score,
        updatedAt: new Date().toISOString(),
      };

      return {
        ok: true,
        publicPath,
        source: "ClassicAutomation",
        sourceUrl: productUrl,
        score: img.score,
      };
    } catch {}
  }

  return { ok: false, reason: "no-live-image", sourceUrl: productUrl };
}

async function main() {
  console.log("Product Image Engine PRO MAX V20.1 started");
  console.log("Limit:", LIMIT);

  const products = readJson(PRODUCTS_PATH, []);
  const cache = readJson(CACHE_PATH, {});
  const state = readJson(STATE_PATH, { index: 0 });

  if (!products.length) {
    console.error("No products found");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  let checked = 0;
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = Number(state.index || 0); i < products.length; i++) {
    if (checked >= LIMIT) break;

    const product = products[i];

    if (!needsImageFix(product)) {
      skipped++;
      state.index = i + 1;
      continue;
    }

    checked++;

    console.log(`\n[${i + 1}/${products.length}] ${product.brand} ${product.model}`);

    const result = await recoverImage(page, product, cache);

    if (result.ok) {
      product.image = result.publicPath;
      product.imageSource = result.source;
      if (result.sourceUrl) product.sourceUrl = result.sourceUrl;

      fixed++;
      console.log("Fixed:", result.publicPath);
    } else {
      failed++;
      console.log("Failed:", result.reason);
    }

    state.index = i + 1;
    state.updatedAt = new Date().toISOString();

    writeJson(PRODUCTS_PATH, products);
    writeJson(CACHE_PATH, cache);
    writeJson(STATE_PATH, state);
  }

  await browser.close();

  writeJson(PRODUCTS_PATH, products);
  writeJson(CACHE_PATH, cache);
  writeJson(STATE_PATH, state);

  console.log("\nV20.1 Finished");
  console.log("Checked:", checked);
  console.log("Fixed:", fixed);
  console.log("Failed:", failed);
  console.log("Skipped already good:", skipped);
  console.log("Next index:", state.index);
}

main();