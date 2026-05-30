const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const START_URLS = [
  { brand: "GEFRAN", url: "https://rfyl.en.alibaba.com/productgrouplist-963806678/GEFRAN.html" },
  { brand: "BELIMO", url: "https://rfyl.en.alibaba.com/productgrouplist-963782870/BELIMO.html" },
  { brand: "Cisco", url: "https://rfyl.en.alibaba.com/productgrouplist-961397546/Cisco.html" },
  { brand: "Turck", url: "https://rfyl.en.alibaba.com/productgrouplist-951120261/Turck.html" },
  { brand: "Beckhoff", url: "https://rfyl.en.alibaba.com/productgrouplist-952372808/Beckhoff.html" },
  { brand: "Keyence", url: "https://rfyl.en.alibaba.com/productgrouplist-952329669/Keyence.html" },
  { brand: "Rexroth", url: "https://rfyl.en.alibaba.com/productgrouplist-951538083/Rexroth.html" },
  { brand: "Danfoss", url: "https://rfyl.en.alibaba.com/productgrouplist-951245513/Danfoss.html" },
  { brand: "Other PLC", url: "https://rfyl.en.alibaba.com/productgrouplist-951077084/Other_plc.html" },
  { brand: "SMC", url: "https://rfyl.en.alibaba.com/productgrouplist-951067491/Smc.html" },
  { brand: "Banner", url: "https://rfyl.en.alibaba.com/productgrouplist-952483582/Banner.html" },
  { brand: "Sick", url: "https://rfyl.en.alibaba.com/productgrouplist-952147319/Sick.html" },
  { brand: "ABB", url: "https://rfyl.en.alibaba.com/productgrouplist-952267709/ABB.html" },
  { brand: "Festo", url: "https://rfyl.en.alibaba.com/productgrouplist-952512308/Festo.html" },
  { brand: "Honeywell", url: "https://rfyl.en.alibaba.com/productgrouplist-952296627/Honeywell.html" },
  { brand: "Panasonic", url: "https://rfyl.en.alibaba.com/productgrouplist-952291298/Panasonic.html" },
  { brand: "IFM", url: "https://rfyl.en.alibaba.com/productgrouplist-952483581/IFM.html" },
  { brand: "Omron", url: "https://rfyl.en.alibaba.com/productgrouplist-952137777/Omron.html" },
  { brand: "Schneider", url: "https://rfyl.en.alibaba.com/productgrouplist-952310500/Schneider.html" },
  { brand: "Siemens", url: "https://rfyl.en.alibaba.com/productgrouplist-952276890/Simatic.html" },
];

const MAX_PAGES_PER_URL = 50;
const LIMIT_PER_PAGE = 50;
const TOTAL_LIMIT = 500;

const jsonPath = path.join(process.cwd(), "data", "products.json");
const imageDir = path.join(process.cwd(), "public", "product-images");

if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
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
  let result = String(url).replace(/\\\//g, "/").replace(/&amp;/g, "&");
  if (result.startsWith("//")) result = "https:" + result;
  if (result.startsWith("http:/") && !result.startsWith("http://")) {
    result = result.replace("http:/", "http://");
  }
  if (result.startsWith("https:/") && !result.startsWith("https://")) {
    result = result.replace("https:/", "https://");
  }
  return result;
}

function buildPageUrl(baseUrl, pageNo) {
  if (pageNo <= 1) return baseUrl;

  const url = new URL(baseUrl);

  url.searchParams.set("page", String(pageNo));
  url.searchParams.set("spm", "a2700.shop_plser.88.17");

  return url.toString();
}

const BRAND_RULES = [
  { brand: "Siemens", keywords: ["siemens", "simatic", "6es", "6av", "6ep", "s7-300", "s7-400", "s7-1200", "s7-1500"] },
  { brand: "Honeywell", keywords: ["honeywell", "c300", "dc2500", "cc-", "tk-", "mc-", "tc-", "8c-", "8u-", "5130", "5140"] },
  { brand: "ABB", keywords: ["abb", "pm8", "ai8", "ao8", "di8", "do8", "ci8", "ac800m"] },
  { brand: "Schneider", keywords: ["schneider", "modicon", "tsx", "140cpu", "bmx", "m340", "m580"] },
  { brand: "Allen Bradley", keywords: ["allen bradley", "allen-bradley", "rockwell", "1756", "1769", "1746", "1734"] },
  { brand: "Omron", keywords: ["omron", "cj1", "cj2", "cs1", "nx-", "nx1p", "cp1"] },
  { brand: "Mitsubishi", keywords: ["mitsubishi", "qj", "fx", "a1s", "q64", "q68", "mr-j"] },
  { brand: "Yokogawa", keywords: ["yokogawa", "aai", "adv", "ale", "centum"] },
  { brand: "Emerson", keywords: ["emerson", "deltav", "delta v", "ve400", "kj"] },
  { brand: "Foxboro", keywords: ["foxboro", "fbm", "fcp", "p091"] },
  { brand: "Triconex", keywords: ["triconex", "tricon", "t8461", "t8431", "t8312"] },
  { brand: "Bently Nevada", keywords: ["bently", "3500/", "3300/", "330180"] },
];

function guessBrand(text, fallbackBrand = "") {
  const lower = String(text || "").toLowerCase();

  for (const rule of BRAND_RULES) {
    if (rule.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return rule.brand;
    }
  }

  return fallbackBrand || "Industrial";
}

function guessCategory(text) {
  const lower = String(text || "").toLowerCase();

  if (lower.includes("dcs")) return "DCS Module";
  if (lower.includes("plc")) return "PLC Module";
  if (lower.includes("controller")) return "Controller";
  if (lower.includes("module")) return "Industrial Module";
  if (lower.includes("hmi")) return "HMI Panel";
  if (lower.includes("servo")) return "Servo Drive";
  if (lower.includes("motor")) return "Motor";
  if (lower.includes("sensor")) return "Sensor";

  return "Industrial Automation Part";
}

function extractModel(text) {
  const cleaned = String(text || "")
    .replace(/&quot;/g, " ")
    .replace(/[%\\]/g, " ")
    .replace(/,/g, " ")
    .toUpperCase();

  const patterns = [
    /6ES7[0-9A-Z-]+/,
    /6AV[0-9A-Z-]+/,
    /1756-[A-Z0-9]+/,
    /1769-[A-Z0-9]+/,
    /1746-[A-Z0-9]+/,
    /1734-[A-Z0-9]+/,
    /DC[0-9A-Z-]+/,
    /CC-[A-Z0-9-]+/,
    /TK-[A-Z0-9-]+/,
    /MC-[A-Z0-9-]+/,
    /TC-[A-Z0-9-]+/,
    /[A-Z0-9]{2,}-[A-Z0-9]{2,}-[A-Z0-9-]{2,}/,
    /[A-Z]{1,6}\d{3,}[A-Z0-9-]*/,
    /\d{3,}-[A-Z0-9-]{2,}/,
    /[A-Z]{2,}-[A-Z0-9]{2,}/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) return match[0];
  }

  return "";
}

function isBadTitle(title) {
  const lower = String(title || "").toLowerCase();

  const badWords = [
    "see all",
    "category",
    "categories",
    "home",
    "about",
    "contact",
    "view more",
    "send inquiry",
    "chat now",
    "supplier homepage",
    "product categories",
    "top picks",
  ];

  return badWords.some((word) => lower.includes(word));
}

function generateDescription(brand, model, category) {
  return `${brand} ${model} is an industrial automation ${category} supplied by GlobalPLCParts for PLC systems, DCS systems, factory control, process automation and maintenance replacement projects. Request quotation, stock availability and worldwide shipping support.`;
}

async function downloadImage(page, imageUrl, fileName) {
  if (!imageUrl) return "";

  try {
    const url = normalizeUrl(imageUrl);
    const response = await page.request.get(url);

    if (!response.ok()) return "";

    const buffer = await response.body();
    if (buffer.length < 3000) return "";

    const filePath = path.join(imageDir, fileName);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buffer);
    }

    return `/product-images/${fileName}`;
  } catch {
    return "";
  }
}

function loadExistingProducts() {
  if (!fs.existsSync(jsonPath)) return [];

  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  } catch {
    return [];
  }
}

function saveProducts(products) {
  fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), "utf-8");
}

function extractProductObjects(html) {
  const products = [];
  const moduleDataMatches = Array.from(html.matchAll(/module-data="([^"]+)"/g));

  for (const match of moduleDataMatches) {
    try {
      const decoded = decodeURIComponent(match[1].replace(/&amp;/g, "&"));

      if (!decoded.includes("productList")) continue;

      const json = JSON.parse(decoded);
      const list = json?.mds?.moduleData?.data?.productList || [];

      for (const item of list) {
        const title = item.subject || "";
        const sourceUrl = normalizeUrl(item.url || "");

        const image = normalizeUrl(
          item.imageUrls?.x350 ||
            item.imageUrls?.x220 ||
            item.imageUrls?.original ||
            item.imageUrlList?.[0]?.x350 ||
            item.imageUrlList?.[0]?.original ||
            ""
        );

        if (!title || title.length < 8) continue;
        if (isBadTitle(title)) continue;

        products.push({
          title,
          sourceUrl,
          image,
        });
      }
    } catch {
      continue;
    }
  }

  return products;
}

async function scrapePage(page, pageUrl, productMap, addedTotal, fallbackBrand) {
  console.log("Opening page:", pageUrl);

  await page.goto(pageUrl, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  await page.waitForTimeout(6000);

  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(1000);
  }

  const html = await page.content();
  fs.writeFileSync("alibaba-latest.html", html, "utf-8");

  const items = extractProductObjects(html);
  console.log("Extracted items:", items.length);

  let addedThisPage = 0;

  for (const item of items) {
    if (addedThisPage >= LIMIT_PER_PAGE) break;
    if (addedTotal.count >= TOTAL_LIMIT) break;

    const sourceText = `${item.title} ${item.sourceUrl}`;
    const model = extractModel(sourceText);

    if (!model) {
      console.log("SKIP no model:", item.title);
      continue;
    }

    const brand = guessBrand(sourceText, fallbackBrand);
    const brandSlug = slugify(brand);
    const category = guessCategory(item.title);
    const slug = `${brandSlug}-${slugify(model)}`;
    const key = `${brandSlug}-${model}`.toLowerCase();

    if (productMap.has(key)) {
      console.log("SKIP duplicate:", brand, model);
      continue;
    }

    const imageName = `${slug}.jpg`;
    const image = await downloadImage(page, item.image, imageName);

    const product = {
      slug,
      brand,
      brandSlug,
      model,
      category,
      description: generateDescription(brand, model, category),
      image,
      sourceUrl: item.sourceUrl || pageUrl,
    };

    productMap.set(key, product);
    addedThisPage++;
    addedTotal.count++;

    console.log("Added:", brand, model);
  }

  console.log("Added this page:", addedThisPage);
  return addedThisPage;
}

async function main() {
  const existingProducts = loadExistingProducts();
  const productMap = new Map();

  for (const product of existingProducts) {
    const brandSlug = product.brandSlug || slugify(product.brand);
    const key = `${brandSlug}-${product.model}`.toLowerCase();
    productMap.set(key, product);
  }

  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage({
    viewport: {
      width: 1400,
      height: 900,
    },
  });

  const addedTotal = { count: 0 };

  for (const source of START_URLS) {
    if (addedTotal.count >= TOTAL_LIMIT) break;

    console.log("======================================");
    console.log("Start brand:", source.brand);
    console.log("======================================");

    for (let pageNo = 1; pageNo <= MAX_PAGES_PER_URL; pageNo++) {
      if (addedTotal.count >= TOTAL_LIMIT) break;

      const pageUrl = buildPageUrl(source.url, pageNo);

      const addedThisPage = await scrapePage(
        page,
        pageUrl,
        productMap,
        addedTotal,
        source.brand
      );

      saveProducts(Array.from(productMap.values()));

      if (addedThisPage === 0 && pageNo > 5) {
  console.log("No new products after page 5. Stop current source.");
  break;
}

      await page.waitForTimeout(3000);
    }
  }

  const finalProducts = Array.from(productMap.values());
  saveProducts(finalProducts);

  console.log("======================================");
  console.log("New products added total:", addedTotal.count);
  console.log("Total products:", finalProducts.length);
  console.log("======================================");

  await browser.close();
}

main();