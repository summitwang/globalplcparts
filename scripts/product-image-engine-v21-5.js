const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LIMIT = Number(process.argv[2] || 100);

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const REAL_DIR = path.join(PUBLIC_DIR, "product-images", "real");
const CACHE_PATH = path.join(process.cwd(), "data", "image-cache-v21.json");
const STATE_PATH = path.join(process.cwd(), "data", "image-state-v21.json");

const SOURCES = [
  {
    name: "ClassicAutomation",
    searchUrl: (brand, model) =>
      `https://www.classicautomation.com/catalogsearch/result/?q=${encodeURIComponent(`${brand} ${model}`)}`,
    allowed: ["classicautomation.com"],
  },
  {
    name: "Radwell",
    searchUrl: (brand, model) =>
      `https://www.radwell.com/en-US/Search/?q=${encodeURIComponent(model)}`,
    allowed: ["radwell.com"],
  },
  {
    name: "MRO Electric",
    searchUrl: (brand, model) =>
      `https://www.mroelectric.com/search?q=${encodeURIComponent(model)}`,
    allowed: ["mroelectric.com"],
  },
  {
    name: "PLC Center",
    searchUrl: (brand, model) =>
      `https://www.plccenter.com/Search?q=${encodeURIComponent(model)}`,
    allowed: ["plccenter.com"],
  },
  {
    name: "DO Supply",
    searchUrl: (brand, model) =>
      `https://www.dosupply.com/search/?q=${encodeURIComponent(model)}`,
    allowed: ["dosupply.com"],
  },
];

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

function isBadImageUrl(url) {
  const u = String(url || "").toLowerCase();

  if (!u.startsWith("http")) return true;
  if (u.endsWith(".svg")) return true;
  if (u.includes("logo")) return true;
  if (u.includes("icon")) return true;
  if (u.includes("sprite")) return true;
  if (u.includes("placeholder")) return true;
  if (u.includes("banner")) return true;
  if (u.includes("favicon")) return true;
  if (u.includes("tracking")) return true;
  if (u.includes("pixel")) return true;

  return false;
}

function scoreImage(img, model) {
  let score = 0;

  const u = String(img.url || "").toLowerCase();
  const alt = String(img.alt || "").toLowerCase();
  const m = String(model || "").toLowerCase();

  score += Number(img.width || 0);
  score += Number(img.height || 0);

  if (u.includes(m.replace(/\//g, "-"))) score += 500;
  if (u.includes(m.replace(/\//g, ""))) score += 400;
  if (alt.includes(m)) score += 500;

  if (u.includes("product")) score += 150;
  if (u.includes("images")) score += 80;
  if (u.includes("media")) score += 80;
  if (u.includes("cache")) score += 30;

  if (Number(img.width || 0) >= 200 && Number(img.height || 0) >= 200) {
    score += 200;
  }

  return score;
}

function normalizeUrl(url, pageUrl = "") {
  if (!url) return "";

  const value = String(url).trim();

  if (value.startsWith("//")) return "https:" + value;

  if (value.startsWith("/")) {
    try {
      const base = new URL(pageUrl);
      return `${base.origin}${value}`;
    } catch {
      return value;
    }
  }

  return value;
}

async function isRemoteImageAlive(url) {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
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
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: referer,
      },
    });

    const type = String(res.headers["content-type"] || "").toLowerCase();

    if (!type.includes("image")) {
      throw new Error("Not image");
    }

    if (!res.data || res.data.length < 2500) {
      throw new Error("Image too small");
    }

    fs.writeFileSync(savePath, res.data);
    return true;
  } catch (err) {
    throw new Error(err.message || "Download failed");
  }
}

function makeSavePath(product, imageUrl, sourceName) {
  const brandSlug = getBrandSlug(product.brand);
  const brandDir = path.join(REAL_DIR, brandSlug);

  if (!fs.existsSync(brandDir)) {
    fs.mkdirSync(brandDir, { recursive: true });
  }

  const lower = String(imageUrl || "").toLowerCase();

  const ext = lower.includes(".png")
    ? ".png"
    : lower.includes(".webp")
    ? ".webp"
    : ".jpg";

  const fileName = `${brandSlug}-${slugify(product.model)}-${slugify(
    sourceName
  )}${ext}`;

  const savePath = path.join(brandDir, fileName);
  const publicPath = `/product-images/real/${brandSlug}/${fileName}`;

  return {
    savePath,
    publicPath,
  };
}

async function collectImagesFromPage(page, pageUrl, model) {
  try {
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(2200);
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(800);

    const images = await page.evaluate((pageUrl) => {
      const out = [];
      const host = location.hostname.toLowerCase();

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

      function addImgList(selector, label) {
        const imgs = Array.from(document.querySelectorAll(selector));

        for (const img of imgs) {
          add(
            img.getAttribute("data-zoom-image") ||
              img.getAttribute("data-large-image") ||
              img.getAttribute("data-full") ||
              img.getAttribute("data-original") ||
              img.getAttribute("data-src") ||
              img.getAttribute("data-lazy") ||
              img.getAttribute("data-image") ||
              img.getAttribute("data-img") ||
              img.src ||
              img.getAttribute("src"),
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            img.alt,
            label
          );

          const srcset = img.getAttribute("srcset");
          if (srcset) {
            const best = srcset
              .split(",")
              .map((x) => x.trim())
              .map((x) => {
                const parts = x.split(/\s+/);
                return {
                  url: parts[0],
                  size: parseInt(parts[1] || "0", 10) || 0,
                };
              })
              .sort((a, b) => b.size - a.size)[0];

            if (best?.url) {
              add(
                best.url,
                img.naturalWidth || img.width,
                img.naturalHeight || img.height,
                img.alt,
                `${label} srcset`
              );
            }
          }
        }
      }

      // 1) ClassicAutomation / Magento
      if (host.includes("classicautomation.com")) {
        addImgList(".product-info-main img", "classic product-info-main");
        addImgList(".product.media img", "classic product-media");
        addImgList(".gallery-placeholder img", "classic gallery");
        addImgList(".fotorama__img", "classic fotorama");
        addImgList(".product-image-main img", "classic product-image-main");
      }

      // 2) Radwell
      if (host.includes("radwell.com")) {
        addImgList(".product-image img", "radwell product-image");
        addImgList(".product-images img", "radwell product-images");
        addImgList(".product-gallery img", "radwell product-gallery");
        addImgList(".carousel img", "radwell carousel");
        addImgList("[data-testid*='image'] img", "radwell testid-image");
        addImgList("img[alt*='Radwell']", "radwell alt");
      }

      // 3) MRO Electric
      if (host.includes("mroelectric.com")) {
        addImgList(".productView-image img", "mro productView-image");
        addImgList(".productView-thumbnail img", "mro thumbnail");
        addImgList(".product-image img", "mro product-image");
        addImgList(".product-gallery img", "mro gallery");
        addImgList("img[data-src]", "mro data-src");
      }

      // 4) PLC Center
      if (host.includes("plccenter.com")) {
        addImgList(".product-image img", "plccenter product-image");
        addImgList(".gallery img", "plccenter gallery");
        addImgList(".product-gallery img", "plccenter product-gallery");
        addImgList(".item img", "plccenter item");
        addImgList("img[data-large]", "plccenter data-large");
      }

      // 5) DO Supply
      if (host.includes("dosupply.com")) {
        addImgList(".product-gallery img", "dosupply gallery");
        addImgList(".product-image img", "dosupply product-image");
        addImgList(".image-gallery img", "dosupply image-gallery");
        addImgList(".zoom img", "dosupply zoom");
        addImgList("img[srcset]", "dosupply srcset");
      }

      // 6) JSON-LD image extraction
      const jsonScripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );

      for (const script of jsonScripts) {
        try {
          const data = JSON.parse(script.textContent || "{}");
          const items = Array.isArray(data) ? data : [data];

          for (const item of items) {
            const image = item.image;

            if (typeof image === "string") {
              add(image, 0, 0, "", "jsonld image");
            }

            if (Array.isArray(image)) {
              for (const img of image) {
                if (typeof img === "string") {
                  add(img, 0, 0, "", "jsonld image array");
                }

                if (img && typeof img === "object" && img.url) {
                  add(img.url, 0, 0, "", "jsonld image object");
                }
              }
            }
          }
        } catch {}
      }

      // 7) OpenGraph / Twitter image
      const metaSelectors = [
        'meta[property="og:image"]',
        'meta[property="og:image:secure_url"]',
        'meta[name="twitter:image"]',
        'meta[itemprop="image"]',
      ];

      for (const selector of metaSelectors) {
        const meta = document.querySelector(selector);
        const content = meta?.getAttribute("content");

        if (content) {
          add(content, 0, 0, "", selector);
        }
      }

      // 8) General fallback
      addImgList(".product img", "general product");
      addImgList(".product-main img", "general product-main");
      addImgList(".main-image img", "general main-image");
      addImgList(".gallery img", "general gallery");
      addImgList("img", "general img");

      // 9) Regex fallback
      const html = document.documentElement.innerHTML;

      const matches =
        html.match(
          /https?:\/\/[^"'\\]+?\.(jpg|jpeg|png|webp)(\?[^"'\\]*)?/gi
        ) || [];

      for (const m of matches) {
        add(m, 0, 0, "", "html-regex");
      }

      return out;
    }, pageUrl);

    return images
      .map((x) => ({
        ...x,
        url: normalizeUrl(x.url, pageUrl),
      }))
      .filter((x) => !isBadImageUrl(x.url))
      .filter(
        (x, index, arr) => arr.findIndex((y) => y.url === x.url) === index
      )
      .map((x) => ({
        ...x,
        score: scoreImage(x, model),
      }))
      .sort((a, b) => b.score - a.score);
  } catch (err) {
    console.log("Collect page failed:", err.message);
    return [];
  }
}

async function findCandidateProductPages(page, source, brand, model) {
  const searchUrl = source.searchUrl(brand, model);

  console.log("Search:", source.name, searchUrl);

  try {
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(1800);

    const allowed = source.allowed;
    const modelLower = String(model || "").toLowerCase();
    const modelSlug = modelLower.replace(/\//g, "-");

    const links = await page.evaluate(
      ({ allowed, modelLower, modelSlug }) => {
        return Array.from(document.querySelectorAll("a"))
          .map((a) => a.href || "")
          .filter(Boolean)
          .filter((href) => {
            const lower = href.toLowerCase();

            if (!allowed.some((domain) => lower.includes(domain))) {
              return false;
            }

            if (lower.includes("login")) return false;
            if (lower.includes("cart")) return false;
            if (lower.includes("checkout")) return false;
            if (lower.includes("contact")) return false;
            if (lower.includes("about")) return false;

            return (
              lower.includes(modelLower) ||
              lower.includes(modelSlug) ||
              lower.includes(modelLower.replace(/\//g, ""))
            );
          });
      },
      { allowed, modelLower, modelSlug }
    );

    return Array.from(new Set(links)).slice(0, 5);
  } catch (err) {
    console.log("Search failed:", source.name, err.message);
    return [];
  }
}

async function recoverImageFromSource(page, source, product, cache) {
  const brand = String(product.brand || "");
  const model = String(product.model || "");
  const key = `${source.name}::${brand}::${model}`;

  if (cache[key]?.publicPath && localFileExists(cache[key].publicPath)) {
    return {
      ok: true,
      publicPath: cache[key].publicPath,
      source: source.name,
      fromCache: true,
    };
  }

  const productPages = await findCandidateProductPages(
    page,
    source,
    brand,
    model
  );

  if (!productPages.length) {
    return {
      ok: false,
      reason: "no-product-page",
      source: source.name,
    };
  }

  for (const productPageUrl of productPages) {
    console.log("Candidate:", productPageUrl);

    const images = await collectImagesFromPage(page, productPageUrl, model);

    if (!images.length) {
      continue;
    }

    for (const img of images.slice(0, 5)) {
      const alive = await isRemoteImageAlive(img.url);

      if (!alive) {
        continue;
      }

      const { savePath, publicPath } = makeSavePath(
        product,
        img.url,
        source.name
      );

      try {
        if (!fs.existsSync(savePath)) {
          await downloadImage(img.url, savePath, productPageUrl);
        }

        cache[key] = {
          publicPath,
          source: source.name,
          sourceUrl: productPageUrl,
          remoteUrl: img.url,
          score: img.score,
          updatedAt: new Date().toISOString(),
        };

        return {
          ok: true,
          publicPath,
          source: source.name,
          sourceUrl: productPageUrl,
          score: img.score,
        };
      } catch (err) {
        console.log("Download failed:", err.message);
      }
    }
  }

  return {
    ok: false,
    reason: "no-live-image",
    source: source.name,
  };
}

async function recoverImage(page, product, cache) {
  const brand = String(product.brand || "");
  const model = String(product.model || "");
  const globalKey = `GLOBAL::${brand}::${model}`;

  if (cache[globalKey]?.publicPath && localFileExists(cache[globalKey].publicPath)) {
    return {
      ok: true,
      publicPath: cache[globalKey].publicPath,
      source: cache[globalKey].source || "cache",
      fromCache: true,
    };
  }

  for (const source of SOURCES) {
    console.log("Trying source:", source.name);

    const result = await recoverImageFromSource(page, source, product, cache);

    if (result.ok) {
      cache[globalKey] = {
        publicPath: result.publicPath,
        source: result.source,
        sourceUrl: result.sourceUrl || "",
        score: result.score || 0,
        updatedAt: new Date().toISOString(),
      };

      return result;
    }

    console.log("Source failed:", source.name, result.reason);
  }

  return {
    ok: false,
    reason: "all-sources-failed",
  };
}

async function main() {
  console.log("Product Image Engine PRO MAX V21.5 started")
  console.log("Limit:", LIMIT);

  const products = readJson(PRODUCTS_PATH, []);
  const cache = readJson(CACHE_PATH, {});
  const state = readJson(STATE_PATH, {
    index: 0,
    fixed: 0,
    failed: 0,
  });

  if (!products.length) {
    console.error("No products found");
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40,
  });

  const page = await browser.newPage({
    viewport: {
      width: 1400,
      height: 900,
    },
  });

  let checked = 0;
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = Number(state.index || 0); i < products.length; i++) {
    if (checked >= LIMIT) {
      break;
    }

    const product = products[i];

    if (!needsImageFix(product)) {
      skipped++;
      state.index = i + 1;
      continue;
    }

    checked++;

    console.log("\n====================================");
    console.log(`[${i + 1}/${products.length}]`);
    console.log("Brand:", product.brand);
    console.log("Model:", product.model);
    console.log("Old image:", product.image);
    console.log("====================================");

    const result = await recoverImage(page, product, cache);

    if (result.ok) {
      product.image = result.publicPath;
      product.imageSource = result.source;

      if (result.sourceUrl) {
        product.sourceUrl = result.sourceUrl;
      }

      fixed++;
      state.fixed = Number(state.fixed || 0) + 1;

      console.log("FIXED:", result.publicPath);
      console.log("SOURCE:", result.source);
    } else {
      failed++;
      state.failed = Number(state.failed || 0) + 1;

      console.log("FAILED:", result.reason);
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

  console.log("\n====================================");
  console.log("V21 FINISHED");
  console.log("Checked:", checked);
  console.log("Fixed this run:", fixed);
  console.log("Failed this run:", failed);
  console.log("Skipped already good:", skipped);
  console.log("Next index:", state.index);
  console.log("Total fixed:", state.fixed || 0);
  console.log("Total failed:", state.failed || 0);
  console.log("====================================");
}

main();