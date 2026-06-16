const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const BRAND = process.argv[2];
const START_URL = process.argv[3];
const LIMIT = Number(process.argv[4] || 150);

if (!BRAND || !START_URL) {
  console.error('Usage: npm run scrape-brand-gallery -- "Allen Bradley" "https://xxx.com/page" 150');
  process.exit(1);
}

const REAL_DIR = path.join(process.cwd(), "public", "product-images", "real");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const brandSlug = slugify(BRAND);
const BRAND_DIR = path.join(REAL_DIR, brandSlug);

if (!fs.existsSync(BRAND_DIR)) {
  fs.mkdirSync(BRAND_DIR, { recursive: true });
}

function isBadImage(url) {
  const u = String(url || "").toLowerCase();

  const badWords = [
    "logo",
    "icon",
    "sprite",
    "transparent",
    "favicon",
    "banner",
    "hero",
    "background",
    "social",
    "people",
    "person",
    "career",
    "office",
    "event",
    "webinar",
    "case-study",
    "story",
    "promotion",
    "texture",
    "pattern",
    "header",
    "footer",
    "cookie",
  ];

  if (!u.startsWith("http")) return true;
  if (u.endsWith(".svg")) return true;
  if (u.includes("data:image")) return true;

  return badWords.some((word) => u.includes(word));
}

async function downloadImage(url, savePath) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: START_URL,
    },
  });

  if (!res.data || res.data.length < 8000) {
    throw new Error("Image too small");
  }

  fs.writeFileSync(savePath, res.data);
}

async function autoScroll(page) {
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(800);
  }
}

async function getCategoryLinks(page) {
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => ({
        text: (a.innerText || "").trim(),
        href: a.href,
      }))
      .filter((x) => x.href);
  });

  return links
    .filter((x) =>
      [
        "circuit",
        "condition",
        "connection",
        "energy",
        "human machine",
        "industrial automation",
        "i/o",
        "motion control",
        "motor",
        "network",
        "plantpax",
        "power",
        "programmable",
        "push button",
        "relay",
        "safety",
        "sensor",
        "signal",
        "variable frequency",
      ].some((k) => x.text.toLowerCase().includes(k))
    )
    .map((x) => x.href)
    .filter((href, index, arr) => arr.indexOf(href) === index);
}

async function collectImagesFromPage(page, url) {
  console.log("Scanning page:", url);

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(2500);
    await autoScroll(page);

    return await page.evaluate(() => {
      const urls = [];

      function addUrl(url, width, height, alt) {
        if (!url) return;
        const first = String(url).split(" ")[0];

        urls.push({
          url: first,
          width: Number(width || 0),
          height: Number(height || 0),
          alt: alt || "",
        });
      }

      for (const img of Array.from(document.querySelectorAll("img"))) {
        addUrl(
          img.src ||
            img.getAttribute("data-src") ||
            img.getAttribute("data-original") ||
            img.getAttribute("data-lazy-src"),
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          img.alt
        );

        const srcset = img.getAttribute("srcset");
        if (srcset) {
          addUrl(
            srcset,
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            img.alt
          );
        }
      }

      for (const source of Array.from(document.querySelectorAll("source"))) {
        const srcset = source.getAttribute("srcset");
        if (srcset) addUrl(srcset, 0, 0, "");
      }

      return urls;
    });
  } catch (err) {
    console.log("Page failed:", err.message);
    return [];
  }
}

async function main() {
  console.log("Official Brand Gallery Scraper v11.2 AUTO CATEGORY started");
  console.log("Brand:", BRAND);
  console.log("Start URL:", START_URL);
  console.log("Limit:", LIMIT);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  await page.goto(START_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  const categoryLinks = await getCategoryLinks(page);

  const pagesToScan = [START_URL, ...categoryLinks].filter(
    (url, index, arr) => arr.indexOf(url) === index
  );

  console.log("Category pages found:", pagesToScan.length);

  let allImages = [];

  for (const url of pagesToScan) {
    if (allImages.length >= LIMIT * 2) break;

    const imgs = await collectImagesFromPage(page, url);
    allImages.push(...imgs);
  }

  const seen = new Set();

  const cleanImages = allImages
    .filter((item) => {
      const url = item.url;

      if (!url || seen.has(url)) return false;
      seen.add(url);

      if (isBadImage(url)) return false;

      const w = item.width;
      const h = item.height;

      if (w && h) {
        if (w < 120 || h < 120) return false;
        if (w > h * 2.5) return false;
        if (h > w * 2.5) return false;
      }

      return true;
    })
    .slice(0, LIMIT);

  console.log("Raw images found:", allImages.length);
  console.log("Clean product-like images:", cleanImages.length);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of cleanImages) {
    const url = item.url;

    const ext = url.toLowerCase().includes(".png")
      ? ".png"
      : url.toLowerCase().includes(".webp")
      ? ".webp"
      : ".jpg";

    const fileName = `${brandSlug}-${String(Date.now()).slice(-6)}-${
      downloaded + 1
    }${ext}`;

    const savePath = path.join(BRAND_DIR, fileName);

    try {
      console.log("Downloading:", url);
      await downloadImage(url, savePath);
      downloaded++;
      console.log("Saved:", `/product-images/real/${brandSlug}/${fileName}`);
    } catch (err) {
      failed++;
      console.log("Failed:", err.message);
    }
  }

  await browser.close();

  console.log("Finished");
  console.log("Category pages:", pagesToScan.length);
  console.log("Downloaded:", downloaded);
  console.log("Skipped:", skipped);
  console.log("Failed:", failed);
  console.log("Folder:", `/product-images/real/${brandSlug}`);
}

main();