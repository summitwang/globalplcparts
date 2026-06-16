const fs = require("fs");
const path = require("path");

const productsPath = path.join(process.cwd(), "data", "products.json");
const publicDir = path.join(process.cwd(), "public");

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

let missing = 0;
const missingList = [];

for (const p of products) {
  const img = p.image;

  if (!img) {
    missing++;
    missingList.push({
      brand: p.brand,
      model: p.model,
      image: "(empty)",
    });
    continue;
  }

  if (!img.startsWith("/")) continue;

  const fullPath = path.join(publicDir, img.replace(/^\//, ""));

  if (!fs.existsSync(fullPath)) {
    missing++;
    missingList.push({
      brand: p.brand,
      model: p.model,
      image: img,
    });
  }
}

console.log("Missing local images:", missing);
console.log(missingList.slice(0, 50));