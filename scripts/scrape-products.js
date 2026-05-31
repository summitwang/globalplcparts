const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const TARGET_COUNT = Number(process.argv[2] || 1000);

const START_URL =
  process.argv[3] ||
  "https://rfyl.en.alibaba.com/productgrouplist.html";

const outputPath = path.join(__dirname, "../data/products-scraped.json");

const industrialKeywords = [
  "plc",
  "module",
  "controller",
  "automation",
  "dcs",
  "hmi",
  "drive",
  "inverter",
  "sensor",
  "relay",
  "cpu",
  "power supply",
  "input",
  "output",
  "terminal",
  "siemens",
  "allen bradley",
  "schneider",
  "abb",
  "honeywell",
  "yokogawa",
  "emerson",
  "bently",
  "ge fanuc",
  "mitsubishi",
  "omron",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function detectBrand(title) {
  const brands = [
    "Siemens",
    "Allen Bradley",
    "Schneider",
    "ABB",
    "Honeywell",
    "Yokogawa",
    "Emerson",
    "Bently Nevada",
    "GE Fanuc",
    "Mitsubishi",
    "Omron",
    "Foxboro",
    "Prosoft",
    "Phoenix Contact",
    "Beckhoff",
    "Delta",
    "Fuji",
    "Keyence",
    "Panasonic",
    "Cisco",
    "Gefran",
    "Belimo",
  ];

  const lower = title.toLowerCase();

  return (
    brands.find((brand) =>
      lower.includes(brand.toLowerCase())
    ) || "Industrial"
  );
}

function cleanTitle(text) {
  return String(text)
    .replace(/\s+/g, " ")
    .replace(/Alibaba|Hot Sale|Best Price/gi, "")
    .trim();
}

function isIndustrial(title) {
  const lower = title.toLowerCase();
  return industrialKeywords.some((keyword) => lower.includes(keyword));
}

async function autoScroll(page) {
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 1200);
    await sleep(1200);
  }
}

async function scrapeCurrentPage(page) {
  await autoScroll(page);

  const items = await page.evaluate(() => {
    const results = [];

    const cards = Array.from(
      document.querySelectorAll(
        "a[href*='/product-detail/'], a[href*='/product/'], .product-item, .icbu-product-card"
      )
    );

    for (const card of cards) {
      const link =
        card.href ||
        card.querySelector?.("a")?.href ||
        "";

      const title =
        card.innerText ||
        card.querySelector?.("img")?.alt ||
        "";

      const img =
        card.querySelector?.("img")?.src ||
        card.querySelector?.("img")?.getAttribute("data-src") ||
        "";

      if (title && link) {
        results.push({
          title,
          link,
          image: img,
        });
      }
    }

    return results;
  });

  return items;
}

async function main() {
  console.log("🚀 Start scraping products...");
  console.log("Target:", TARGET_COUNT);
  console.log("URL:", START_URL);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 80,
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  const collected = [];
  const seen = new Set();

  let currentUrl = START_URL;
  let pageNumber = 1;

  while (collected.length < TARGET_COUNT) {
    console.log(`\n📄 Scraping page ${pageNumber}`);
    console.log(currentUrl);

    await page.goto(currentUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await sleep(3000);

    const rawItems = await scrapeCurrentPage(page);

    console.log("Found raw items:", rawItems.length);

    for (const item of rawItems) {
      const title = cleanTitle(item.title);

      if (!title) continue;
      if (!isIndustrial(title)) continue;

      const brand = detectBrand(title);
      const model =
        title.match(/[A-Z0-9]{2,}[-A-Z0-9/]{2,}/)?.[0] ||
        title.split(" ").slice(0, 4).join(" ");

      const key = `${brand}-${model}`.toLowerCase();

      if (seen.has(key)) continue;
      seen.add(key);

      const slug = slugify(`${brand}-${model}`);

      collected.push({
        slug,
        brand,
        brandSlug: slugify(brand),
        model,
        category: "Industrial Automation Parts",
        description: `${brand} ${model} industrial automation spare part for PLC, DCS, HMI, control system and factory maintenance applications.`,
        image: item.image || "/product-images/default-plc.png",
      });

      console.log(`✅ ${collected.length}. ${brand} ${model}`);

      if (collected.length >= TARGET_COUNT) break;
    }

    const nextButton = await page
      .locator("a:has-text('Next'), button:has-text('Next')")
      .first();

    if (await nextButton.count()) {
      try {
        await nextButton.click();
        await sleep(3000);
        currentUrl = page.url();
      } catch {
        console.log("⚠️ Next button failed, stop.");
        break;
      }
    } else {
      console.log("⚠️ No next page found, stop.");
      break;
    }

    pageNumber++;
  }

  await browser.close();

  fs.writeFileSync(outputPath, JSON.stringify(collected, null, 2));

  console.log("\n🎉 Scraping finished.");
  console.log("Total products:", collected.length);
  console.log("Saved to:", outputPath);
}

main().catch((err) => {
  console.error("❌ Scraper error:", err);
});