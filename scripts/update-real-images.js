const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PRODUCTS_PATH = path.join(
  process.cwd(),
  "data/products.json"
);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const products = JSON.parse(
    fs.readFileSync(PRODUCTS_PATH, "utf8")
  );

  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage();

  let updated = 0;

  for (const product of products) {

    if (
      product.image &&
      !product.image.includes("default-plc")
    ) {
      continue;
    }

    if (!product.sourceUrl) continue;

    try {

      console.log(
        "Checking:",
        product.model
      );

      await page.goto(
        product.sourceUrl,
        {
          waitUntil: "domcontentloaded",
          timeout: 60000
        }
      );

      await sleep(3000);

      const img = await page.evaluate(() => {

        const images = Array.from(
          document.querySelectorAll("img")
        );

        const target = images.find(img =>
          img.src &&
          img.src.startsWith("http")
        );

        return target?.src || "";
      });

      if (img) {

        product.image = img;

        updated++;

        console.log(
          "✓ image updated"
        );
      }

    } catch (e) {
      console.log(
        "skip:",
        product.model
      );
    }
  }

  fs.writeFileSync(
    PRODUCTS_PATH,
    JSON.stringify(products, null, 2)
  );

  await browser.close();

  console.log(
    "Finished:",
    updated
  );
}

main();