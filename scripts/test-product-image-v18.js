const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");

const PRODUCT_URL = process.argv[2];
const SAVE_NAME = process.argv[3] || "v18-test.jpg";

if (!PRODUCT_URL) {
  console.error('Usage: npm run test-image-v18 -- "产品详情页URL"');
  process.exit(1);
}

const BASE_URL = "https://www.classicautomation.com";
const SAVE_DIR = path.join(process.cwd(), "public", "product-images", "test");

if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
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

function isBadImage(url) {
  const u = String(url || "").toLowerCase();

  if (!u.startsWith("http")) return true;
  if (!u.includes("/media/catalog/product/")) return true;

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
    "blog"
  ];

  return bad.some((x) => u.includes(x));
}

function scoreImage(img) {
  let score = 0;

  const u = String(img.url || "").toLowerCase();

  if (u.includes("/media/catalog/product/")) score += 100;
  if (u.includes("/cache/")) score += 30;

  score += Number(img.width || 0);
  score += Number(img.height || 0);

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

      return {
        url: candidate,
        size: res.data.length,
      };
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(lastError || "Download failed");
}

async function extractBestImage(page, productUrl) {
  await page.goto(productUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(2000);

  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(500);
  }

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
        from,
      });
    }

    const selectors = [
      ".fotorama__img",
      ".gallery-placeholder img",
      ".product.media img",
      ".product-image-main img",
      ".product-info-main img",
      ".product-photo img",
      ".product-image img",
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
            add(
              best.url,
              img.naturalWidth || img.width,
              img.naturalHeight || img.height,
              img.alt,
              selector + " srcset"
            );
          }
        }
      }
    }

    for (const a of Array.from(document.querySelectorAll("a"))) {
      const href = a.href || "";
      if (href.includes("/media/catalog/product/")) {
        add(href, 0, 0, a.innerText || "", "a[href]");
      }
    }

    const jsonText = document.documentElement.innerHTML;

    const matches = jsonText.match(/https?:\/\/[^"'\\]+\/media\/catalog\/product\/[^"'\\]+?\.(jpg|jpeg|png|webp)/gi) || [];

    for (const m of matches) {
      add(m, 0, 0, "", "html-regex");
    }

    return out;
  });

  const clean = images
    .map((x) => ({
      ...x,
      url: makeOriginalUrl(normalizeUrl(x.url)),
    }))
    .filter((x) => !isBadImage(x.url))
    .filter((x, index, arr) => arr.findIndex((y) => y.url === x.url) === index)
    .map((x) => ({
      ...x,
      score: scoreImage(x),
    }))
    .sort((a, b) => b.score - a.score);

  console.log("Found images:", images.length);
  console.log("Clean images:", clean.length);
  console.table(clean.slice(0, 10).map((x) => ({
    score: Math.round(x.score),
    width: x.width,
    height: x.height,
    from: x.from,
    url: x.url.slice(0, 120),
  })));

  return clean[0] || null;
}

async function main() {
  console.log("V18 Image Smart Picker started");
  console.log("URL:", PRODUCT_URL);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  const best = await extractBestImage(page, PRODUCT_URL);

  if (!best) {
    console.log("No valid image found.");
    await browser.close();
    process.exit(0);
  }

  const ext = best.url.toLowerCase().includes(".png")
    ? ".png"
    : best.url.toLowerCase().includes(".webp")
    ? ".webp"
    : ".jpg";

  const file = SAVE_NAME.replace(/\.(jpg|jpeg|png|webp)$/i, "") + ext;
  const savePath = path.join(SAVE_DIR, file);

  const result = await downloadImage(best.url, savePath, PRODUCT_URL);

  console.log("Best image:", best.url);
  console.log("Downloaded from:", result.url);
  console.log("Size:", result.size);
  console.log("Saved:", `/product-images/test/${file}`);

  await browser.close();
}

main();