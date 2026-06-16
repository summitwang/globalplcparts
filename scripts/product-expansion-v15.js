const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const INPUT_BRAND = process.argv[2] || "auto";
const LIMIT = Number(process.argv[3] || 80);
const MAX_PAGES = Number(process.argv[4] || 10);
const CATEGORY_URL = process.argv[5];

const BASE_URL = "https://www.classicautomation.com";
const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const REAL_DIR = path.join(process.cwd(), "public", "product-images", "real");

if (!CATEGORY_URL) {
  console.error(
    'Usage: npm run expand-products-v15 -- "ABB" 80 10 "https://www.classicautomation.com/parts/abb"'
  );
  process.exit(1);
}

const BRAND_RULES = [
  {
    brand: "Allen Bradley",
    slug: "allen-bradley",
    urlPart: "/parts/allen-bradley/",
    removePrefixes: ["ALLEN-BRADLEY-", "ALLEN BRADLEY-", "AB-"],
  },
  {
    brand: "ABB",
    slug: "abb",
    urlPart: "/parts/abb/",
    removePrefixes: ["ABB-"],
  },
  {
    brand: "Siemens",
    slug: "siemens",
    urlPart: "/parts/siemens/",
    removePrefixes: ["SIEMENS-"],
  },
  {
    brand: "Schneider",
    slug: "schneider",
    urlPart: "/parts/schneider-electric/",
    removePrefixes: ["SCHNEIDER-ELECTRIC-", "SCHNEIDER-"],
  },
  {
    brand: "Omron",
    slug: "omron",
    urlPart: "/parts/omron/",
    removePrefixes: ["OMRON-"],
  },
  {
    brand: "Mitsubishi",
    slug: "mitsubishi",
    urlPart: "/parts/mitsubishi/",
    removePrefixes: ["MITSUBISHI-"],
  },
  {
    brand: "Honeywell",
    slug: "honeywell",
    urlPart: "/parts/honeywell/",
    removePrefixes: ["HONEYWELL-"],
  },
  {
    brand: "Yokogawa",
    slug: "yokogawa",
    urlPart: "/parts/yokogawa/",
    removePrefixes: ["YOKOGAWA-"],
  },
  {
    brand: "Emerson",
    slug: "emerson",
    urlPart: "/parts/emerson/",
    removePrefixes: ["EMERSON-"],
  },
  {
    brand: "GE Fanuc",
    slug: "ge-fanuc",
    urlPart: "/parts/ge-fanuc/",
    removePrefixes: ["GE-FANUC-", "GE FANUC-"],
  },
];

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

function getBrandRule(url) {
  const lowerUrl = String(url || "").toLowerCase();

  const byUrl = BRAND_RULES.find((r) => lowerUrl.includes(r.urlPart));
  if (byUrl) return byUrl;

  const input = String(INPUT_BRAND || "").toLowerCase();
  const byInput = BRAND_RULES.find(
    (r) => r.brand.toLowerCase() === input || r.slug === slugify(input)
  );

  return byInput || BRAND_RULES[0];
}

const BRAND_RULE = getBrandRule(CATEGORY_URL);
const brandName = BRAND_RULE.brand;
const brandSlug = BRAND_RULE.slug;
const BRAND_DIR = path.join(REAL_DIR, brandSlug);

if (!fs.existsSync(BRAND_DIR)) {
  fs.mkdirSync(BRAND_DIR, { recursive: true });
}

function isValidIndustrialModel(model) {
  const upper = String(model || "").toUpperCase().trim();

  if (!upper) return false;
  if (upper.length < 4) return false;

  const badWords = [
    "DRIVES",
    "ELECTRICAL",
    "AUTOMATION",
    "PRODUCTS",
    "CONTROL",
    "SYSTEMS",
    "SOLUTIONS",
    "SERVICES",
    "SOFTWARE",
    "INDUSTRIAL",
    "CONTACT",
    "ABOUT",
    "CATALOG",
    "SEARCH",
    "HOME",
    "LOGIN",
    "REGISTER",
    "CART",
    "CHECKOUT",
  ];

  return !badWords.includes(upper);
}

function cleanModel(rawModel) {
  let model = String(rawModel || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "-");

  for (const prefix of BRAND_RULE.removePrefixes) {
    if (model.startsWith(prefix)) {
      model = model.slice(prefix.length);
    }
  }

  model = model.replace(/-+/g, "-").replace(/^-|-$/g, "");

  return model;
}

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE_URL + url;
  return url;
}

function getRawModelFromUrl(url) {
  return String(url || "")
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(/\.html$/i, "")
    .toUpperCase();
}

function isSameBrandUrl(url) {
  return String(url || "").toLowerCase().includes(BRAND_RULE.urlPart);
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

  const bad = [
    "logo",
    "icon",
    "sprite",
    "placeholder",
    "transparent",
    "favicon",
    "banner",
    "hero",
    "background",
    "social",
    "people",
    "person",
    "office",
    "career",
    "blog",
    "payment",
    "warranty",
    "guarantee",
    "fragile",
    "shipping",
    "tracking",
    "classic-logo",
    "bat.bing",
    "2-year",
    "year-warranty",
    "box",
    "carton",
    "package",
  ];

  if (u.endsWith(".svg")) return false;
  if (u.includes("data:image")) return false;

  return !bad.some((x) => u.includes(x));
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
        if (!isSameBrandUrl(lower)) return false;
        if (lower.includes("/media/")) return false;
        if (lower.includes("/customer/")) return false;
        if (lower.includes("/checkout/")) return false;
        if (lower.includes("/catalogsearch/")) return false;
        if (lower.includes("#")) return false;

        const rawModel = getRawModelFromUrl(href);
        const model = cleanModel(rawModel);

        if (!isValidIndustrialModel(model)) {
          console.log("Skip non-model:", model);
          return false;
        }

        return true;
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

async function scanCategory(page) {
  const productLinks = [];
  const visited = new Set();
  let currentUrl = CATEGORY_URL;

  for (let i = 1; i <= MAX_PAGES; i++) {
    if (!currentUrl || visited.has(currentUrl)) break;

    visited.add(currentUrl);

    const links = await collectProductLinksOnPage(page, currentUrl);
    console.log("Same-brand product links:", links.length);

    productLinks.push(...links);

    if (productLinks.length >= LIMIT * 3) break;

    const nextUrl = await findNextPageUrl(page);
    if (!nextUrl || visited.has(nextUrl)) break;

    currentUrl = nextUrl;
  }

  return productLinks.filter((url, index, arr) => arr.indexOf(url) === index);
}

async function extractProductDetail(page, productUrl) {
  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
      const title =
        document.querySelector("h1")?.innerText ||
        document.querySelector(".page-title")?.innerText ||
        "";

      const desc =
        document.querySelector(".product.attribute.description")?.innerText ||
        document.querySelector(".description")?.innerText ||
        "";

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
          if (srcset) {
            add(
              srcset,
              img.naturalWidth || img.width,
              img.naturalHeight || img.height,
              img.alt
            );
          }
        }

        if (out.length > 0 && selector !== "img") break;
      }

      for (const a of Array.from(document.querySelectorAll("a"))) {
        const href = a.href || "";
        if (href.includes("/media/catalog/product/")) {
          add(href, 0, 0, "");
        }
      }

      return { title, desc, images: out };
    });

    const imageUrl =
      data.images
        .map((x) => ({
          ...x,
          url: makeOriginalUrl(normalizeUrl(x.url)),
        }))
        .filter((x) => isGoodImage(x.url))
        .filter((x) => {
          const w = x.width;
          const h = x.height;

          if (w && h) {
            if (w < 60 || h < 60) return false;
            if (w > h * 4) return false;
            if (h > w * 4) return false;
          }

          return true;
        })[0]?.url || "";

    return {
      title: data.title,
      desc: data.desc,
      imageUrl,
    };
  } catch (err) {
    console.log("Product page failed:", err.message);
    return { title: "", desc: "", imageUrl: "" };
  }
}

function makeProduct(model, imagePath, sourceUrl, desc) {
  const slug = `${brandSlug}-${slugify(model)}`;

  return {
    slug,
    brand: brandName,
    brandSlug,
    model,
    category: "PLC Module",
    description:
      desc ||
      `${brandName} ${model} PLC Module for industrial automation systems, PLC control, DCS process automation, factory maintenance and spare parts replacement.`,
    image: imagePath,
    seoTitle: `${brandName} ${model} PLC Module Supplier | GlobalPLCParts`,
    seoDescription: `Request a quote for ${brandName} ${model} PLC Module. GlobalPLCParts supplies PLC, DCS, HMI and industrial automation spare parts with worldwide shipping.`,
    keywords: [
      `${brandName} ${model}`,
      `${brandName} ${model} supplier`,
      `${brandName} ${model} price`,
      `${brandName} ${model} stock`,
      `${brandName} spare parts`,
      `${model} replacement`,
      `${model} module`,
    ],
    availability: "Available on request",
    warranty: "12 months warranty available",
    shipping: "Worldwide shipping supported",
    rfqText: `Request a quotation for ${brandName} ${model}. Send quantity and destination country to check price, stock and lead time.`,
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

function shouldReplaceImage(oldImage) {
  const img = String(oldImage || "").toLowerCase();

  if (!img) return true;
  if (img.includes("default")) return true;
  if (img.includes("placeholder")) return true;
  if (img.includes("library")) return true;
  if (img.includes("rockwellautomation.scene7")) return true;

  return false;
}

async function main() {
  console.log("Product Expansion PRO MAX V15.1 FIX started");
  console.log("Input brand:", INPUT_BRAND);
  console.log("Detected brand:", brandName);
  console.log("Brand slug:", brandSlug);
  console.log("Limit:", LIMIT);
  console.log("Max pages:", MAX_PAGES);
  console.log("Category:", CATEGORY_URL);

  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error("products.json not found:", PRODUCTS_PATH);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const productLinks = await scanCategory(page);
  console.log("Unique same-brand product links:", productLinks.length);

  let downloaded = 0;
  let updated = 0;
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const productUrl of productLinks) {
    if (downloaded >= LIMIT) break;

    const rawModel = getRawModelFromUrl(productUrl);
    const model = cleanModel(rawModel);

    if (!isValidIndustrialModel(model)) {
      console.log("Skip non-model:", model);
      skipped++;
      continue;
    }

    console.log("Product detail:", model, productUrl);

    const detail = await extractProductDetail(page, productUrl);

    if (!detail.imageUrl) {
      failed++;
      continue;
    }

    const ext = detail.imageUrl.toLowerCase().includes(".png")
      ? ".png"
      : detail.imageUrl.toLowerCase().includes(".webp")
      ? ".webp"
      : ".jpg";

    const fileName = `${brandSlug}-${slugify(model)}${ext}`;
    const savePath = path.join(BRAND_DIR, fileName);
    const publicPath = `/product-images/real/${brandSlug}/${fileName}`;

    try {
      if (!fs.existsSync(savePath)) {
        await downloadImage(detail.imageUrl, savePath, productUrl);
        downloaded++;
      }

      const existing = products.find(
        (p) =>
          String(p.brand || "").toLowerCase() === brandName.toLowerCase() &&
          String(p.model || "").toUpperCase() === model.toUpperCase()
      );

      if (existing) {
        if (shouldReplaceImage(existing.image)) {
          existing.image = publicPath;
          existing.source = "ClassicAutomation";
          existing.sourceUrl = productUrl;
          updated++;
          console.log("Updated existing:", model);
        } else {
          skipped++;
          console.log("Skipped existing good image:", model);
        }
      } else {
        products.push(makeProduct(model, publicPath, productUrl, detail.desc));
        added++;
        console.log("Added new product:", model);
      }
    } catch (err) {
      failed++;
      console.log("Failed:", err.message);
    }
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  await browser.close();

  console.log("Finished");
  console.log("Downloaded images:", downloaded);
  console.log("Updated existing products:", updated);
  console.log("Added new products:", added);
  console.log("Skipped:", skipped);
  console.log("Failed:", failed);
  console.log("Total products:", products.length);
}

main();