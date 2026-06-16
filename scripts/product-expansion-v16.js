const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const LIMIT_PER_BRAND = Number(process.argv[2] || 200);
const MAX_PAGES_PER_BRAND = Number(process.argv[3] || 50);

const BASE_URL = "https://www.classicautomation.com";
const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const REAL_DIR = path.join(process.cwd(), "public", "product-images", "real");

const BRAND_RULES = [
  {
    brand: "Allen Bradley",
    slug: "allen-bradley",
    url: "https://www.classicautomation.com/parts/allen-bradley",
    urlPart: "/parts/allen-bradley/",
    removePrefixes: ["ALLEN-BRADLEY-", "ALLEN BRADLEY-", "AB-"],
  },
  {
    brand: "ABB",
    slug: "abb",
    url: "https://www.classicautomation.com/parts/abb",
    urlPart: "/parts/abb/",
    removePrefixes: ["ABB-"],
  },
  {
    brand: "Siemens",
    slug: "siemens",
    url: "https://www.classicautomation.com/parts/siemens",
    urlPart: "/parts/siemens/",
    removePrefixes: ["SIEMENS-"],
  },
  {
    brand: "Schneider",
    slug: "schneider",
    url: "https://www.classicautomation.com/parts/schneider-electric",
    urlPart: "/parts/schneider-electric/",
    removePrefixes: ["SCHNEIDER-ELECTRIC-", "SCHNEIDER-"],
  },
  {
    brand: "Omron",
    slug: "omron",
    url: "https://www.classicautomation.com/parts/omron",
    urlPart: "/parts/omron/",
    removePrefixes: ["OMRON-"],
  },
  {
    brand: "Mitsubishi",
    slug: "mitsubishi",
    url: "https://www.classicautomation.com/parts/mitsubishi",
    urlPart: "/parts/mitsubishi/",
    removePrefixes: ["MITSUBISHI-"],
  },
  {
    brand: "Honeywell",
    slug: "honeywell",
    url: "https://www.classicautomation.com/parts/honeywell",
    urlPart: "/parts/honeywell/",
    removePrefixes: ["HONEYWELL-"],
  },
  {
    brand: "Yokogawa",
    slug: "yokogawa",
    url: "https://www.classicautomation.com/parts/yokogawa",
    urlPart: "/parts/yokogawa/",
    removePrefixes: ["YOKOGAWA-"],
  },
  {
    brand: "Emerson",
    slug: "emerson",
    url: "https://www.classicautomation.com/parts/emerson",
    urlPart: "/parts/emerson/",
    removePrefixes: ["EMERSON-"],
  },
  {
    brand: "GE Fanuc",
    slug: "ge-fanuc",
    url: "https://www.classicautomation.com/parts/ge-fanuc",
    urlPart: "/parts/ge-fanuc/",
    removePrefixes: ["GE-FANUC-", "GE FANUC-"],
  },
  {
    brand: "Bently Nevada",
    slug: "bently-nevada",
    url: "https://www.classicautomation.com/parts/bently-nevada",
    urlPart: "/parts/bently-nevada/",
    removePrefixes: ["BENTLY-NEVADA-", "BENTLY NEVADA-"],
  },
  {
    brand: "Foxboro",
    slug: "foxboro",
    url: "https://www.classicautomation.com/parts/foxboro",
    urlPart: "/parts/foxboro/",
    removePrefixes: ["FOXBORO-"],
  },
  {
    brand: "HIMA",
    slug: "hima",
    url: "https://www.classicautomation.com/parts/hima",
    urlPart: "/parts/hima/",
    removePrefixes: ["HIMA-"],
  },
  {
    brand: "Bachmann",
    slug: "bachmann",
    url: "https://www.classicautomation.com/parts/bachmann",
    urlPart: "/parts/bachmann/",
    removePrefixes: ["BACHMANN-"],
  },
  {
    brand: "Rexroth",
    slug: "rexroth",
    url: "https://www.classicautomation.com/parts/rexroth",
    urlPart: "/parts/rexroth/",
    removePrefixes: ["REXROTH-", "BOSCH-REXROTH-"],
  },
  {
    brand: "ProSoft",
    slug: "prosoft",
    url: "https://www.classicautomation.com/parts/prosoft",
    urlPart: "/parts/prosoft/",
    removePrefixes: ["PROSOFT-"],
  },
  {
    brand: "Woodward",
    slug: "woodward",
    url: "https://www.classicautomation.com/parts/woodward",
    urlPart: "/parts/woodward/",
    removePrefixes: ["WOODWARD-"],
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

function cleanModel(rawModel, rule) {
  let model = String(rawModel || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "-");

  for (const prefix of rule.removePrefixes) {
    if (model.startsWith(prefix)) {
      model = model.slice(prefix.length);
    }
  }

  model = model.replace(/-+/g, "-").replace(/^-|-$/g, "");

  return model;
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

  if (badWords.includes(upper)) return false;

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

async function collectProductLinksOnPage(page, url, rule) {
  console.log("Scanning list page:", url);

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

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

async function scanBrand(page, rule) {
  const productLinks = [];
  const visited = new Set();
  let currentUrl = rule.url;

  for (let i = 1; i <= MAX_PAGES_PER_BRAND; i++) {
    if (!currentUrl || visited.has(currentUrl)) break;

    visited.add(currentUrl);

    const links = await collectProductLinksOnPage(page, currentUrl, rule);
    console.log(`[${rule.brand}] product links on page:`, links.length);

    productLinks.push(...links);

    if (productLinks.length >= LIMIT_PER_BRAND * 3) break;

    const nextUrl = await findNextPageUrl(page);
    if (!nextUrl || visited.has(nextUrl)) break;

    if (!String(nextUrl).toLowerCase().includes(rule.urlPart)) break;

    currentUrl = nextUrl;
  }

  return productLinks.filter((url, index, arr) => arr.indexOf(url) === index);
}

async function extractProductDetail(page, productUrl) {
  try {
    await page.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

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

      return {
        title,
        desc,
        images: out,
      };
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
    return {
      title: "",
      desc: "",
      imageUrl: "",
    };
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

async function processBrand(page, products, rule) {
  console.log("\n====================================");
  console.log("Brand:", rule.brand);
  console.log("URL:", rule.url);
  console.log("====================================");

  const brandDir = path.join(REAL_DIR, rule.slug);

  if (!fs.existsSync(brandDir)) {
    fs.mkdirSync(brandDir, { recursive: true });
  }

  const productLinks = await scanBrand(page, rule);
  console.log(`[${rule.brand}] unique product links:`, productLinks.length);

  let downloaded = 0;
  let updated = 0;
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const productUrl of productLinks) {
    if (downloaded >= LIMIT_PER_BRAND) break;

    const rawModel = getRawModelFromUrl(productUrl);
    const model = cleanModel(rawModel, rule);

    if (!isValidIndustrialModel(model)) {
      skipped++;
      continue;
    }

    console.log(`[${rule.brand}] Product detail:`, model, productUrl);

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

    const fileName = `${rule.slug}-${slugify(model)}${ext}`;
    const savePath = path.join(brandDir, fileName);
    const publicPath = `/product-images/real/${rule.slug}/${fileName}`;

    try {
      if (!fs.existsSync(savePath)) {
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

  return {
    brand: rule.brand,
    downloaded,
    updated,
    added,
    skipped,
    failed,
  };
}

async function main() {
  console.log("Product Expansion PRO MAX V16 started");
  console.log("Limit per brand:", LIMIT_PER_BRAND);
  console.log("Max pages per brand:", MAX_PAGES_PER_BRAND);

  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error("products.json not found:", PRODUCTS_PATH);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  const results = [];

  for (const rule of BRAND_RULES) {
    const result = await processBrand(page, products, rule);
    results.push(result);

    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");
    console.log("products.json saved after:", rule.brand);
  }

  await browser.close();

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("\n====================================");
  console.log("V16 ALL BRANDS FINISHED");
  console.table(results);
  console.log("Total products:", products.length);
  console.log("====================================");
}

main();