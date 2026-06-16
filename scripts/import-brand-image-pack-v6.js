const fs = require("fs");
const path = require("path");
const axios = require("axios");
const XLSX = require("xlsx");

const excelPath = process.argv[2];

if (!excelPath) {
  console.error("Please provide Excel file path.");
  console.error("Example: npm run import-brand-pack -- brand-image-pack.xlsx");
  process.exit(1);
}

const REAL_DIR = path.join(
  process.cwd(),
  "public",
  "product-images",
  "real"
);

function slugify(text) {
  return String(text || "")
    .toLowerCase()
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
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const brand = row.brand || row.Brand;
    const imageUrl = row.imageUrl || row.ImageUrl || row.image || row.Image;
    const customFileName = row.fileName || row.FileName;

    if (!brand || !imageUrl) {
      skipped++;
      continue;
    }

    const brandSlug = slugify(brand);
    const brandDir = path.join(REAL_DIR, brandSlug);

    if (!fs.existsSync(brandDir)) {
      fs.mkdirSync(brandDir, { recursive: true });
    }

    const ext =
      String(imageUrl).toLowerCase().includes(".png")
        ? ".png"
        : String(imageUrl).toLowerCase().includes(".webp")
        ? ".webp"
        : ".jpg";

    const fileName =
      customFileName ||
      `${brandSlug}-${String(downloaded + 1).padStart(2, "0")}${ext}`;

    const savePath = path.join(brandDir, fileName);

    if (fs.existsSync(savePath)) {
      skipped++;
      continue;
    }

    try {
      console.log("Downloading:", brand, imageUrl);
      await downloadImage(imageUrl, savePath);
      downloaded++;
    } catch (err) {
      console.log("Failed:", brand, err.message);
      failed++;
    }
  }

  console.log("Official Image Pack Import finished");
  console.log("Rows:", rows.length);
  console.log("Downloaded:", downloaded);
  console.log("Skipped:", skipped);
  console.log("Failed:", failed);
}

main();