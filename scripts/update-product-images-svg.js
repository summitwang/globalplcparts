const fs = require("fs");
const path = require("path");

const productsPath = path.join(__dirname, "../data/products.json");

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

const updatedProducts = products.map((product) => ({
  ...product,
  image: `/product-images/${slugify(product.brand)}.svg`,
}));

fs.writeFileSync(
  productsPath,
  JSON.stringify(updatedProducts, null, 2),
  "utf8"
);

console.log("✅ Updated product image paths to SVG");
console.log("Total products:", updatedProducts.length);