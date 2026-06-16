const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const TARGET_BRAND = process.argv[2] || "Allen-Bradley";
const LIMIT = Number(process.argv[3] || 150);
const MAX_PAGES = Number(process.argv[4] || 20);

const BASE_URL = "https://www.classicautomation.com";
const REAL_DIR = path.join(process.cwd(), "public", "product-images", "real");

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

if (!fs.existsSync(BRAND_DIR)) {
  fs.mkdirSync(BRAND_DIR, { recursive: true });
}

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE_URL + url;
  return url;
}

function isGoodClassicProductImage(url) {
  const u = String(url || "").toLowerCase();

  if (!u.startsWith("http")) return false;
  if (!u.includes("/media/catalog/product/")) return false;

  const badWords = [
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
    "classic-box",
    "fragile",
    "shipping",
    "tracking",
    "bat.bing",
  ];

  if (u.endsWith(".svg")) return false;
  if (u.includes("data:image")) return false;

  return !badWords.some((word) => u.includes(word));
}

async function downloadImage(url, savePath, referer) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: referer || BASE_URL,
    },
  });

  if (!res.data || res.data.length < 6000) {
    throw new Error("Image too small");
  }

  fs.writeFileSync(savePath, res.data);
}

async function collectBrandLinks(page) {
  await page.goto(BASE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(2500);

  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a"))
      .map((a) => ({
        text: (a.innerText || "").trim(),
        href: a.href,
      }))
      .filter((x) => x.href && x.text)
  );

  const target = TARGET_BRAND.toLowerCase();
  const targetSlug = slugify(TARGET_BRAND);

  return links
    .filter((x) => {
      const text = x.text.toLowerCase();
      const href = x.href.toLowerCase();

      return (
        href.includes("/parts/") &&
        (text.includes(target) ||
          href.includes(target.replace(/\s+/g, "-")) ||
          href.includes(targetSlug))
      );
    })
    .map((x) => x.href)
    .filter((href, index, arr) => arr.indexOf(href) === index)
    .slice(0, 30);
}

async function collectMoreCategoryLinks(page, url) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(2000);

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a"))
        .map((a) => ({
          text: (a.innerText || "").trim(),
          href: a.href,
        }))
        .filter((x) => x.href)
    );

    const brandSlugLower = slugify(TARGET_BRAND);

    return links
      .filter((x) => {
        const href = x.href.toLowerCase();

        return (
          href.includes("/parts/") &&
          (href.includes(brandSlugLower) ||
            href.includes(brandSlugLower.replace("-", "")))
        );
      })
      .map((x) => x.href)
      .filter((href, index, arr) => arr.indexOf(href) === index)
      .slice(0, 80);
  } catch {
    return [];
  }
}

async function autoScroll(page) {
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(700);
  }
}

async function collectProductImagesOnCurrentPage(page) {
  await autoScroll(page);

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

    const productSelectors = [
      ".product-item img",
      ".products-grid img",
      ".products-list img",
      ".product-image-photo",
      ".product-item-photo img",
      ".product.photo.product-item-photo img",
      "img",
    ];

    for (const selector of productSelectors) {
      const imgs = Array.from(document.querySelectorAll(selector));

      for (const img of imgs) {
        const src =
          img.src ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-original") ||
          img.getAttribute("data-lazy-src");

        add(src, img.naturalWidth || img.width, img.naturalHeight || img.height, img.alt);

        const srcset = img.getAttribute("srcset");
        if (srcset) {
          add(srcset, img.naturalWidth || img.width, img.naturalHeight || img.height, img.alt);
        }
      }

      if (out.length > 0 && selector !== "img") break;
    }

    return out;
  });

  return images
    .map((x) => ({
      ...x,
      url: normalizeUrl(x.url),
    }))
    .filter((x) => isGoodClassicProductImage(x.url))
    .filter((x) => {
      const w = x.width;
      const h = x.height;

      if (w && h) {
        if (w < 80 || h < 80) return false;
        if (w > h * 3) return false;
        if (h > w * 3) return false;
      }

      return true;
    });
}

async function findNextPageUrl(page) {
  return await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));

    const nextByText = links.find((a) => {
      const t = (a.innerText || "").trim().toLowerCase();
      return t === "next" || t.includes("next");
    });

    if (nextByText && nextByText.href) return nextByText.href;

    const relNext = document.querySelector('link[rel="next"]');
    if (relNext && relNext.href) return relNext.href;

    const nextClass = links.find((a) => {
      const cls = String(a.className || "").toLowerCase();
      return cls.includes("next");
    });

    if (nextClass && nextClass.href) return nextClass.href;

    return "";
  });
}

async function scanPaginatedCategory(page, startUrl) {
  const found = [];
  const visited = new Set();
  let currentUrl = startUrl;

  for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex++) {
    if (!currentUrl || visited.has(currentUrl)) break;

    visited.add(currentUrl);

    console.log(`Scanning page ${pageIndex}:`, currentUrl);

    try {
      await page.goto(currentUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForTimeout(2000);

      const imgs = await collectProductImagesOnCurrentPage(page);
      console.log("Product images on page:", imgs.length);

      found.push(
        ...imgs.map((x) => ({
          ...x,
          pageUrl: currentUrl,
        }))
      );

      if (found.length >= LIMIT * 2) break;

      const nextUrl = await findNextPageUrl(page);

      if (!nextUrl || visited.has(nextUrl)) break;

      currentUrl = nextUrl;
    } catch (err) {
      console.log("Page failed:", err.message);
      break;
    }
  }

  return found;
}

async function main() {
  console.log("Classic Automation Image Scraper V12.1 precise pagination started");
  console.log("Brand:", TARGET_BRAND);
  console.log("Limit:", LIMIT);
  console.log("Max pages:", MAX_PAGES);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  let categoryLinks = await collectBrandLinks(page);

  console.log("Initial brand links:", categoryLinks.length);

  if (!categoryLinks.length) {
    categoryLinks = [`${BASE_URL}/parts/${brandSlug}`];
  }

  const extraLinks = [];

  for (const url of categoryLinks.slice(0, 10)) {
    const found = await collectMoreCategoryLinks(page, url);
    extraLinks.push(...found);
  }

  categoryLinks = [...categoryLinks, ...extraLinks].filter(
    (url, index, arr) => arr.indexOf(url) === index
  );

  console.log("Total category links:", categoryLinks.length);

  let allImages = [];

  for (const url of categoryLinks) {
    if (allImages.length >= LIMIT * 2) break;
    const imgs = await scanPaginatedCategory(page, url);
    allImages.push(...imgs);
  }

  const seen = new Set();

  const cleanImages = allImages
    .filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, LIMIT);

  console.log("Raw product images:", allImages.length);
  console.log("Clean unique product images:", cleanImages.length);

  let downloaded = 0;
  let failed = 0;

  for (const item of cleanImages) {
    const url = item.url;

    const ext = url.toLowerCase().includes(".png")
      ? ".png"
      : url.toLowerCase().includes(".webp")
      ? ".webp"
      : ".jpg";

    const fileName = `${brandSlug}-classic-${String(Date.now()).slice(-6)}-${
      downloaded + 1
    }${ext}`;

    const savePath = path.join(BRAND_DIR, fileName);

    try {
      console.log("Downloading:", url);
      await downloadImage(url, savePath, item.pageUrl);
      downloaded++;
      console.log("Saved:", `/product-images/real/${brandSlug}/${fileName}`);
    } catch (err) {
      failed++;
      console.log("Failed:", err.message);
    }
  }

  await browser.close();

  console.log("Finished");
  console.log("Downloaded:", downloaded);
  console.log("Failed:", failed);
  console.log("Folder:", `/product-images/real/${brandSlug}`);
}

main();