const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");

const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

const stats = {
  total: products.length,
  realLocal: 0,
  svgFallback: 0,
  remote: 0,
  missing: 0,
  badPath: 0,
};

const missing = [];

function existsPublicFile(imagePath) {
  if (!imagePath || !imagePath.startsWith("/")) return false;

  const fullPath = path.join(PUBLIC_DIR, imagePath.replace(/^\//, ""));
  return fs.existsSync(fullPath);
}

for (const p of products) {
  const image = String(p.image || "").trim();

  if (!image || image === "undefined" || image === "null") {
    stats.missing++;
    missing.push({
      brand: p.brand,
      model: p.model,
      image,
      reason: "empty",
    });
    continue;
  }

  if (image.includes("undefined") || image.includes("null")) {
    stats.badPath++;
    missing.push({
      brand: p.brand,
      model: p.model,
      image,
      reason: "bad-path",
    });
    continue;
  }

  if (image.startsWith("http")) {
    stats.remote++;
    continue;
  }

  if (image.endsWith(".svg")) {
    stats.svgFallback++;
    continue;
  }

  if (existsPublicFile(image)) {
    stats.realLocal++;
  } else {
    stats.missing++;
    missing.push({
      brand: p.brand,
      model: p.model,
      image,
      reason: "file-not-found",
    });
  }
}

const reportDir = path.join(process.cwd(), "data", "reports");
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

fs.writeFileSync(
  path.join(reportDir, "image-check-report.json"),
  JSON.stringify({ stats, missing: missing.slice(0, 500) }, null, 2),
  "utf8"
);

console.log("Image Check Finished");
console.table(stats);
console.log("Report saved: data/reports/image-check-report.json");