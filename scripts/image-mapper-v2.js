const fs = require("fs");
const path = require("path");

const productsPath = path.join(
  process.cwd(),
  "data",
  "products.json"
);

const products = JSON.parse(
  fs.readFileSync(productsPath, "utf8")
);

const imagePools = {
  Siemens: [
    "/product-images/real/siemens/siemens-s7-300.jpg",
    "/product-images/real/siemens/siemens-s7-400.jpg",
    "/product-images/real/siemens/siemens-et200.jpg",
    "/product-images/real/siemens/siemens-hmi.jpg",
    "/product-images/real/siemens/siemens-drive.jpg",
  ],

  ABB: [
    "/product-images/real/abb/abb-ac800m.jpg",
    "/product-images/real/abb/abb-drive.jpg",
    "/product-images/real/abb/abb-module.jpg",
    "/product-images/real/abb/abb-plc.jpg",
  ],

  Schneider: [
    "/product-images/real/schneider/schneider-modicon.jpg",
    "/product-images/real/schneider/schneider-m340.jpg",
    "/product-images/real/schneider/schneider-m580.jpg",
    "/product-images/real/schneider/schneider-module.jpg",
  ],

  "Allen Bradley": [
    "/product-images/real/allen-bradley/ab-control-logix.jpg",
    "/product-images/real/allen-bradley/ab-compact-logix.jpg",
    "/product-images/real/allen-bradley/ab-panelview.jpg",
    "/product-images/real/allen-bradley/ab-module.jpg",
  ],
};

let updated = 0;

for (const product of products) {
  const pool = imagePools[product.brand];

  if (!pool) continue;

  const randomImage =
    pool[Math.floor(Math.random() * pool.length)];

  product.image = randomImage;

  updated++;
}

fs.writeFileSync(
  productsPath,
  JSON.stringify(products, null, 2)
);

console.log("Updated:", updated);
console.log("Finished");