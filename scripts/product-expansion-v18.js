const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LIMIT_PER_BRAND = Number(process.argv[2] || 50);
const MAX_PAGES_PER_BRAND = Number(process.argv[3] || 10);

const BASE_URL = "https://www.classicautomation.com";
const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const REAL_DIR = path.join(process.cwd(), "public", "product-images", "real");
const STATE_PATH = path.join(process.cwd(), "data", "classic-crawl-state.json");

const BRAND_RULES = [
  { brand: "Allen Bradley", slug: "allen-bradley", url: "https://www.classicautomation.com/parts/allen-bradley", urlPart: "/parts/allen-bradley/", removePrefixes: ["ALLEN-BRADLEY-", "ALLEN BRADLEY-", "AB-"] },
  { brand: "ABB", slug: "abb", url: "https://www.classicautomation.com/parts/abb", urlPart: "/parts/abb/", removePrefixes: ["ABB-"] },
  { brand: "Siemens", slug: "siemens", url: "https://www.classicautomation.com/parts/siemens", urlPart: "/parts/siemens/", removePrefixes: ["SIEMENS-"] },
  { brand: "Schneider", slug: "schneider", url: "https://www.classicautomation.com/parts/schneider-electric", urlPart: "/parts/schneider-electric/", removePrefixes: ["SCHNEIDER-ELECTRIC-", "SCHNEIDER-"] },
  { brand: "Omron", slug: "omron", url: "https://www.classicautomation.com/parts/omron", urlPart: "/parts/omron/", removePrefixes: ["OMRON-"] },
  { brand: "Mitsubishi", slug: "mitsubishi", url: "https://www.classicautomation.com/parts/mitsubishi", urlPart: "/parts/mitsubishi/", removePrefixes: ["MITSUBISHI-"] },
  { brand: "Honeywell", slug: "honeywell", url: "https://www.classicautomation.com/parts/honeywell", urlPart: "/parts/honeywell/", removePrefixes: ["HONEYWELL-"] },
  { brand: "Yokogawa", slug: "yokogawa", url: "https://www.classicautomation.com/parts/yokogawa", urlPart: "/parts/yokogawa/", removePrefixes: ["YOKOGAWA-"] },
  { brand: "Emerson", slug: "emerson", url: "https://www.classicautomation.com/parts/emerson", urlPart: "/parts/emerson/", removePrefixes: ["EMERSON-"] },
  { brand: "GE Fanuc", slug: "ge-fanuc", url: "https://www.classicautomation.com/parts/ge-fanuc", urlPart: "/parts/ge-fanuc/", removePrefixes: ["GE-FANUC-", "GE FANUC-"] },
  { brand: "Bently Nevada", slug: "bently-nevada", url: "https://www.classicautomation.com/parts/bently-nevada", urlPart: "/parts/bently-nevada/", removePrefixes: ["BENTLY-NEVADA-", "BENTLY NEVADA-"] },
  { brand: "Foxboro", slug: "foxboro", url: "https://www.classicautomation.com/parts/foxboro", urlPart: "/parts/foxboro/", removePrefixes: ["FOXBORO-"] },
  { brand: "HIMA", slug: "hima", url: "https://www.classicautomation.com/parts/hima", urlPart: "/parts/hima/", removePrefixes: ["HIMA-"] },
  { brand: "Bachmann", slug: "bachmann", url: "https://www.classicautomation.com/parts/bachmann", urlPart: "/parts/bachmann/", removePrefixes: ["BACHMANN-"] },
  { brand: "Rexroth", slug: "rexroth", url: "https://www.classicautomation.com/parts/rexroth", urlPart: "/parts/rexroth/", removePrefixes: ["REXROTH-", "BOSCH-REXROTH-"] },
  { brand: "ProSoft", slug: "prosoft", url: "https://www.classicautomation.com/parts/prosoft", urlPart: "/parts/prosoft/", removePrefixes: ["PROSOFT-"] },
  { brand: "Woodward", slug: "woodward", url: "https://www.classicautomation.com/parts/woodward", urlPart: "/parts/woodward/", removePrefixes: ["WOODWARD-"] },
];

function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function buildPageUrl(url, page) {
  if (page <= 1) return url;
  return url.includes("?") ? `${url}&p=${page}` : `${url}?p=${page}`;
}

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

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE_URL + url;
  return url;
}

function isBrandRootUrl(url, rule) {
  const cleanUrl = String(url || "").toLowerCase().split("?")[0].replace(/\/+$/g, "");
  const cleanBrandUrl = String(rule.url || "").toLowerCase().replace(/\/+$/g, "");
  return cleanUrl === cleanBrandUrl;
}

function getRawModelFromUrl(url) {
  return String(url || "").split("/").filter(Boolean).pop().replace(/\.html$/i, "").toUpperCase();
}

function cleanModel(rawModel, rule) {
  let model = String(rawModel || "").toUpperCase().trim().replace(/\s+/g, "-");

  for (const prefix of rule.removePrefixes || []) {
    if (model.startsWith(prefix)) model = model.slice(prefix.length);
  }

  return model.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function extractModelFromTitle(title, rule, fallbackModel) {
  let text = String(title || "").replace(/\s+/g, " ").trim();
  if (!text) return fallbackModel;

  const brandWords = [rule.brand, rule.slug.replace(/-/g, " ")];

  for (const brand of brandWords) {
    const re = new RegExp("^" + brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+", "i");
    text = text.replace(re, "");
  }

  for (const prefix of rule.removePrefixes || []) {
    const plain = prefix.replace(/-$/g, "").replace(/-/g, " ");
    const re = new RegExp("^" + plain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+", "i");
    text = text.replace(re, "");
  }

  text = text
    .replace(/\bPLC\b.*$/i, "")
    .replace(/\bMODULE\b.*$/i, "")
    .replace(/\bSPARE\b.*$/i, "")
    .replace(/\bPARTS\b.*$/i, "")
    .replace(/\bNEW\b.*$/i, "")
    .replace(/\bUSED\b.*$/i, "")
    .replace(/\bREFURBISHED\b.*$/i, "")
    .trim();

  const candidates = text
    .split(/\s+/)
    .map((x) => x.replace(/[^A-Za-z0-9._/-]/g, ""))
    .filter(Boolean);

  let best = candidates.find((x) => /[0-9]/.test(x) && x.length >= 4);
  if (!best && candidates[0]) best = candidates[0];

  return cleanModel(best || fallbackModel, rule);
}

function isValidIndustrialModel(model) {
  const upper = String(model || "").toUpperCase().trim();
  if (!upper) return false;
  if (upper.length < 4) return false;

  const badWords = [
    "DRIVES", "ELECTRICAL", "AUTOMATION", "PRODUCTS", "CONTROL",
    "SYSTEMS", "SOLUTIONS", "SERVICES", "SOFTWARE", "INDUSTRIAL",
    "CONTACT", "ABOUT", "CATALOG", "SEARCH", "HOME", "LOGIN",
    "REGISTER", "CART", "CHECKOUT", "REPAIR", "EXCHANGE", "QUOTE",
    "PARTS", "SELL", "EMAIL", "MANUFACTURER"
  ];

  if (badWords.includes(upper)) return false;
  if (!/[0-9]/.test(upper) && upper.split("-").length <= 1 && upper.length > 18) return false;

  return true;
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

function isGoodImage(url) {
  const u = String(url || "").toLowerCase();

  if (!u.startsWith("http")) return false;
  if (!u.includes("/media/catalog/product/")) return false;
  if (u.endsWith(".svg")) return false;
  if (u.includes("data:image")) return false;

  const bad = ["logo", "icon", "sprite", "placeholder", "transparent", "favicon", "banner", "hero", "social", "career", "blog"];

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
  const candidates = Array.from(new Set([makeOriginalUrl(url), normalizeUrl(url)])).filter(Boolean);
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

async function collectProductLinksOnPage(page, url, rule) {
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
        if (!lower.includes(rule.urlPart)) return false;
        if (isBrandRootUrl(lower, rule)) return false;
        if (lower.includes("/media/")) return false;
        if (lower.includes("/customer/")) return false;
        if (lower.includes("/checkout/")) return false;
        if (lower.includes("/catalogsearch/")) return false;
        if (lower.includes("#")) return false;

        const rawModel = getRawModelFromUrl(href);
        const model = cleanModel(rawModel, rule);

        if (!isValidIndustrialModel(model)) return false;

        return true;
      })
      .map((href) => href.split("?")[0])
      .filter((href, index, arr) => arr.indexOf(href) === index);
  } catch (err) {
    console.log("List page failed:", err.message);
    return [];
  }
}

async function scanBrand(page, rule, state) {
  const productLinks = [];

  const brandState = state[rule.slug] || {
    nextPage: 1,
    scannedPages: [],
    totalLinks: 0,
  };

  const startPage = Number(brandState.nextPage || 1);

  console.log(`[${rule.brand}] Resume from page:`, startPage);

  for (let i = 0; i < MAX_PAGES_PER_BRAND; i++) {
    const pageNumber = startPage + i;
    const currentUrl = buildPageUrl(rule.url, pageNumber);

    if (brandState.scannedPages.includes(pageNumber)) {
      console.log(`[${rule.brand}] Skip scanned page:`, pageNumber);
      continue;
    }

    const links = await collectProductLinksOnPage(page, currentUrl, rule);

    console.log(`[${rule.brand}] page ${pageNumber} product links:`, links.length);

    productLinks.push(...links);

    brandState.scannedPages.push(pageNumber);
    brandState.nextPage = pageNumber + 1;
    brandState.totalLinks = Number(brandState.totalLinks || 0) + links.length;
    brandState.lastRunAt = new Date().toISOString();

    state[rule.slug] = brandState;
    saveState(state);

    if (links.length === 0) {
      console.log(`[${rule.brand}] Empty page, stop this brand.`);
      break;
    }

    if (productLinks.length >= LIMIT_PER_BRAND * 3) break;
  }

  return productLinks.filter((url, index, arr) => arr.indexOf(url) === index);
}

async function extractProductDetail(page, productUrl, rule) {
  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
      const title =
        document.querySelector("h1")?.innerText ||
        document.querySelector(".page-title")?.innerText ||
        document.querySelector("title")?.innerText ||
        "";

      const desc =
        document.querySelector(".product.attribute.description")?.innerText ||
        document.querySelector(".description")?.innerText ||
        document.querySelector(".product-info-main")?.innerText ||
        "";

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
                return {
                  url: parts[0],
                  size: parseInt(parts[1] || "0", 10) || 0,
                };
              })
              .sort((a, b) => b.size - a.size)[0];

            if (best?.url) {
              add(best.url, img.naturalWidth || img.width, img.naturalHeight || img.height, img.alt, selector + " srcset");
            }
          }
        }

        if (out.length > 0 && selector !== "img") break;
      }

      for (const a of Array.from(document.querySelectorAll("a"))) {
        const href = a.href || "";
        if (href.includes("/media/catalog/product/")) {
          add(href, 0, 0, "", "a[href]");
        }
      }

      const html = document.documentElement.innerHTML;
      const matches =
        html.match(/https?:\/\/[^"'\\]+\/media\/catalog\/product\/[^"'\\]+?\.(jpg|jpeg|png|webp)/gi) || [];

      for (const m of matches) {
        add(m, 0, 0, "", "html-regex");
      }

      return { title, desc, images: out };
    });

    const fallbackModel = cleanModel(getRawModelFromUrl(productUrl), rule);
    const modelFromTitle = extractModelFromTitle(data.title, rule, fallbackModel);

    const cleanImages = data.images
      .map((x) => ({ ...x, url: makeOriginalUrl(normalizeUrl(x.url)) }))
      .filter((x) => isGoodImage(x.url))
      .filter((x, index, arr) => arr.findIndex((y) => y.url === x.url) === index)
      .map((x) => ({ ...x, score: scoreImage(x) }))
      .sort((a, b) => b.score - a.score);

    const imageUrl = cleanImages[0]?.url || "";

    console.log("DETAIL DEBUG", {
      url: productUrl,
      title: data.title,
      model: modelFromTitle,
      images: cleanImages.length,
      imageUrl,
    });

    return {
      title: data.title,
      desc: data.desc,
      model: modelFromTitle,
      imageUrl,
    };
  } catch (err) {
    console.log("Product page failed:", err.message);
    return { title: "", desc: "", model: "", imageUrl: "" };
  }
}

function shouldReplaceImage(oldImage) {
  const img = String(oldImage || "").toLowerCase();

  if (!img) return true;
  if (img.includes("default")) return true;
  if (img.includes("placeholder")) return true;
  if (img.includes("library")) return true;
  if (img.includes("rockwellautomation.scene7")) return true;

  return false;
}

function makeProduct(rule, model, imagePath, sourceUrl, desc) {
  const slug = `${rule.slug}-${slugify(model)}`;

  return {
    slug,
    brand: rule.brand,
    brandSlug: rule.slug,
    model,
    category: "PLC Module",
    description:
      desc ||
      `${rule.brand} ${model} PLC Module for industrial automation systems, PLC control, DCS process automation, factory maintenance and spare parts replacement.`,
    image: imagePath,
    seoTitle: `${rule.brand} ${model} PLC Module Supplier | GlobalPLCParts`,
    seoDescription: `Request a quote for ${rule.brand} ${model} PLC Module. GlobalPLCParts supplies PLC, DCS, HMI and industrial automation spare parts with worldwide shipping.`,
    keywords: [
      `${rule.brand} ${model}`,
      `${rule.brand} ${model} supplier`,
      `${rule.brand} ${model} price`,
      `${rule.brand} ${model} stock`,
      `${rule.brand} spare parts`,
      `${model} replacement`,
      `${model} module`,
    ],
    availability: "Available on request",
    warranty: "12 months warranty available",
    shipping: "Worldwide shipping supported",
    rfqText: `Request a quotation for ${rule.brand} ${model}. Send quantity and destination country to check price, stock and lead time.`,
    applications: [
      "PLC control system",
      "DCS process automation",
      "Factory maintenance",
      "Production line replacement",
      "Industrial control cabinet",
    ],
    source: "ClassicAutomation",
    sourceUrl,
  };
}

async function processBrand(page, products, rule, state) {
  console.log("\n====================================");
  console.log("Brand:", rule.brand);
  console.log("URL:", rule.url);
  console.log("====================================");

  const brandDir = path.join(REAL_DIR, rule.slug);

  if (!fs.existsSync(brandDir)) {
    fs.mkdirSync(brandDir, { recursive: true });
  }

  const productLinks = await scanBrand(page, rule, state);
  console.log(`[${rule.brand}] unique product links:`, productLinks.length);

  let downloaded = 0;
  let updated = 0;
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const productUrl of productLinks) {
    if (downloaded + added >= LIMIT_PER_BRAND) break;

    console.log(`[${rule.brand}] Product detail URL:`, productUrl);

    const detail = await extractProductDetail(page, productUrl, rule);
    const model = detail.model;

    if (!model || !isValidIndustrialModel(model)) {
      console.log(`[${rule.brand}] FAILED INVALID MODEL`, {
        url: productUrl,
        title: detail.title,
        model,
      });
      skipped++;
      continue;
    }

    if (!detail.imageUrl) {
      console.log(`[${rule.brand}] NO IMAGE, ADD WITH DEFAULT`, {
        url: productUrl,
        title: detail.title,
        model: detail.model,
      });

      detail.imageUrl = "/product-images/default.jpg";
    }

    console.log(`[${rule.brand}] Model detected:`, model);

    let publicPath = detail.imageUrl;
    let savePath = "";

    if (!detail.imageUrl.startsWith("/product-images/")) {
      const ext = detail.imageUrl.toLowerCase().includes(".png")
        ? ".png"
        : detail.imageUrl.toLowerCase().includes(".webp")
        ? ".webp"
        : ".jpg";

      const fileName = `${rule.slug}-${slugify(model)}${ext}`;
      savePath = path.join(brandDir, fileName);
      publicPath = `/product-images/real/${rule.slug}/${fileName}`;
    }

    try {
      if (!detail.imageUrl.startsWith("/product-images/") && !fs.existsSync(savePath)) {
        await downloadImage(detail.imageUrl, savePath, productUrl);
        downloaded++;
      }

      const existing = products.find(
        (p) =>
          String(p.brand || "").toLowerCase() === rule.brand.toLowerCase() &&
          String(p.model || "").toUpperCase() === model.toUpperCase()
      );

      if (existing) {
        if (shouldReplaceImage(existing.image)) {
          existing.image = publicPath;
          existing.source = "ClassicAutomation";
          existing.sourceUrl = productUrl;
          updated++;
          console.log(`[${rule.brand}] Updated existing:`, model);
        } else {
          skipped++;
          console.log(`[${rule.brand}] Skipped existing good image:`, model);
        }
      } else {
        products.push(makeProduct(rule, model, publicPath, productUrl, detail.desc));
        added++;
        console.log(`[${rule.brand}] Added new product:`, model);
      }
    } catch (err) {
      failed++;
      console.log(`[${rule.brand}] Failed:`, err.message);
    }
  }

  console.log(`[${rule.brand}] Finished`);
  console.log(`[${rule.brand}] Downloaded images:`, downloaded);
  console.log(`[${rule.brand}] Updated existing:`, updated);
  console.log(`[${rule.brand}] Added new:`, added);
  console.log(`[${rule.brand}] Skipped:`, skipped);
  console.log(`[${rule.brand}] Failed:`, failed);

  return { brand: rule.brand, downloaded, updated, added, skipped, failed };
}

async function main() {
  console.log("Product Expansion PRO MAX V18 started");
  console.log("Limit per brand:", LIMIT_PER_BRAND);
  console.log("Max pages per brand:", MAX_PAGES_PER_BRAND);

  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error("products.json not found:", PRODUCTS_PATH);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));
  const state = loadState();

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  const results = [];

  for (const rule of BRAND_RULES) {
    const result = await processBrand(page, products, rule, state);
    results.push(result);

    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");
    saveState(state);

    console.log("products.json saved after:", rule.brand);
  }

  await browser.close();

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");
  saveState(state);

  console.log("\n====================================");
  console.log("V18 SMART RESUME FINISHED");
  console.table(results);
  console.log("Total products:", products.length);
  console.log("State file:", STATE_PATH);
  console.log("====================================");
}

main();