const fs = require("fs");
const path = require("path");
const axios = require("axios");
const XLSX = require("xlsx");

const excelPath = process.argv[2];

if (!excelPath) {
  console.error("Please provide Excel file path.");
  console.error("Example: npm run import-official-images -- official-images.xlsx");
  process.exit(1);
}

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const OUTPUT_DIR = path.join(process.cwd(), "public", "product-images", "models");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

async function downloadImage(url, savePath) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  fs.writeFileSync(savePath, res.data);
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let downloaded = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const brand = row.brand || row.Brand;
    const model = row.model || row.Model;
    const imageUrl = row.image || row.Image;

    if (!brand || !model || !imageUrl) {
      skipped++;
      continue;
    }

    const fileName = `${slugify(brand)}-${slugify(model)}.jpg`;
    const savePath = path.join(OUTPUT_DIR, fileName);
    const publicPath = `/product-images/models/${fileName}`;

    try {
      if (!fs.existsSync(savePath)) {
        console.log("Downloading:", brand, model);
        await downloadImage(imageUrl, savePath);
        downloaded++;
      }

      const product = products.find(
        (p) =>
          String(p.brand || "").toLowerCase() === String(brand).toLowerCase() &&
          String(p.model || "").toLowerCase() === String(model).toLowerCase()
      );

      if (product) {
        product.image = publicPath;

        if (row.sourceUrl || row.SourceUrl) {
          product.imageSourceUrl = row.sourceUrl || row.SourceUrl;
        }

        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.log("Failed:", brand, model, err.message);
      failed++;
    }
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("Official Image Importer v5.1 finished");
  console.log("Rows:", rows.length);
  console.log("Downloaded:", downloaded);
  console.log("Updated products:", updated);
  console.log("Skipped:", skipped);
  console.log("Failed:", failed);
}

main();