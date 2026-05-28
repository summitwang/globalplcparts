const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const START_URL =
"https://rfyl.en.alibaba.com/productgrouplist-952296627/Honeywell.html";

const MAX_PAGES = 5;
const LIMIT_PER_PAGE = 20;
const TOTAL_LIMIT = 100;

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

  const hasQuery = baseUrl.includes("?");

  return `${baseUrl}${hasQuery ? "&" : "?"}page=${pageNo}`;
}

function guessBrand(text) {
  const lower = String(text || "").toLowerCase();

  const brandRules = [
    {
      brand: "Siemens",
      keywords: [
        "siemens",
        "simatic",
        "6es",
        "6av",
        "6ep",
        "s7-300",
        "s7-400",
        "s7-1200",
        "s7-1500",
      ],
    },
    {
      brand: "Honeywell",
      keywords: ["honeywell", "c300", "cc-", "tk-", "mc-", "tc-", "8c-", "8u-"],
    },
    {
      brand: "ABB",
      keywords: ["abb", "pm8", "ai8", "ao8", "di8", "do8", "ci8", "ac800m"],
    },
    {
      brand: "Schneider",
      keywords: ["schneider", "modicon", "tsx", "140cpu", "bmx", "m340", "m580"],
    },
    {
      brand: "Omron",
      keywords: ["omron", "cj1", "cj2", "cs1", "nx-", "nx1p", "cp1"],
    },
    {
      brand: "Mitsubishi",
      keywords: ["mitsubishi", "qj", "fx", "a1s", "q64", "q68", "mr-j"],
    },
    {
      brand: "Allen Bradley",
      keywords: [
        "allen bradley",
        "allen-bradley",
        "rockwell",
        "1756",
        "1769",
        "1746",
        "1734",
      ],
    },
    {
      brand: "Emerson",
      keywords: ["emerson", "delta v", "deltav", "ve400", "kj", "12p"],
    },
    {
      brand: "Yokogawa",
      keywords: ["yokogawa", "aai", "adv", "ale", "stardom", "centum"],
    },
    {
      brand: "Foxboro",
      keywords: ["foxboro", "fbm", "fcp", "p091"],
    },
    {
      brand: "Triconex",
      keywords: ["triconex", "tricon", "t8461", "t8431", "t8312"],
    },
    {
      brand: "Bently Nevada",
      keywords: ["bently", "bently nevada", "3500/", "3300/", "330180"],
    },
    {
      brand: "Festo",
      keywords: ["festo", "cpv", "vmpa", "ms6"],
    },
    {
      brand: "IFM",
      keywords: ["ifm", "efector", "ki5", "kg5", "pn7"],
    },
    {
      brand: "Sick",
      keywords: ["sick", "s30", "wtb", "wl", "c4c"],
    },
    {
      brand: "Pilz",
      keywords: ["pilz", "pnoz", "psen"],
    },
    {
      brand: "Phoenix Contact",
      keywords: ["phoenix", "phoenix contact", "fl switch", "ib il"],
    },
    {
      brand: "Rexroth",
      keywords: ["rexroth", "indramat", "r911", "hmv", "hcs"],
    },
    {
      brand: "Danfoss",
      keywords: ["danfoss", "vlt", "fc-"],
    },
    {
      brand: "Beckhoff",
      keywords: ["beckhoff", "ek1100", "cx"],
    },
    {
      brand: "Keyence",
      keywords: ["keyence", "kv-", "lr-", "fs-", "cz-"],
    },
    {
      brand: "HEIDENHAIN",
      keywords: ["heidenhain", "itnc", "tnc", "ern", "roc"],
    },
    {
      brand: "Johnson Controls",
      keywords: ["johnson controls", "metasys", "pcg", "fx-pca"],
    },
  ];

  for (const rule of brandRules) {
    if (rule.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return rule.brand;
    }
  }

  return "Industrial";
}

function guessCategory(text) {
  const lower = String(text || "").toLowerCase();

  if (lower.includes("dcs")) return "DCS Module";
  if (lower.includes("plc")) return "PLC Module";
  if (lower.includes("safety")) return "Safety System";
  if (lower.includes("controller")) return "Controller";
  if (lower.includes("module")) return "Industrial Module";
  if (lower.includes("servo")) return "Servo Drive";
  if (lower.includes("motor")) return "Motor";
  if (lower.includes("sensor")) return "Sensor";
  if (lower.includes("hmi")) return "HMI Panel";

  return "Industrial Automation Part";
}

function extractModel(text) {
  const cleaned = String(text || "")
    .replace(/&quot;/g, " ")
    .replace(/[%\\]/g, " ")
    .replace(/,/g, " ");

  const patterns = [
    /[A-Z0-9]{2,}[-][A-Z0-9]{2,}[-][A-Z0-9-]{2,}/,
    /[A-Z]{1,6}\d{3,}[A-Z0-9-]*/,
    /\d{3,}[-][A-Z0-9-]{2,}/,
    /[A-Z]{2,}[-][A-Z0-9]{2,}/,
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
    "other plc",
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
  return `${brand} ${model} ${category} supplied by GlobalPLCParts for industrial automation, PLC systems, DCS systems, factory control and process automation applications.`;
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

async function scrapePage(page, pageUrl, productMap, addedTotal) {
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

    const model = extractModel(item.title);

    if (!model) {
      console.log("SKIP no model:", item.title);
      continue;
    }

    const brand = guessBrand(item.title);
    const brandSlug = slugify(brand);
    const category = guessCategory(item.title);
    const slug = `${brandSlug}-${slugify(model)}`;
    const key = `${brandSlug}-${model}`.toLowerCase();

    if (productMap.has(key)) {
      console.log("SKIP duplicate:", model);
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
    const key = `${product.brandSlug}-${product.model}`.toLowerCase();
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

  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    if (addedTotal.count >= TOTAL_LIMIT) break;

    const pageUrl = buildPageUrl(START_URL, pageNo);

    const addedThisPage = await scrapePage(page, pageUrl, productMap, addedTotal);

    saveProducts(Array.from(productMap.values()));

    if (addedThisPage === 0 && pageNo > 1) {
      console.log("No new products on this page. Stop.");
      break;
    }

    await page.waitForTimeout(3000);
  }

  const finalProducts = Array.from(productMap.values());

  saveProducts(finalProducts);

  console.log("New products added total:", addedTotal.count);
  console.log("Total products:", finalProducts.length);

  await browser.close();
}

main();