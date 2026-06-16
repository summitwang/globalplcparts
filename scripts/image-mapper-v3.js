const fs = require("fs");
const path = require("path");

const productsPath = path.join(process.cwd(), "data", "products.json");
const publicDir = path.join(process.cwd(), "public");

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

function fileExists(publicPath) {
  const fullPath = path.join(publicDir, publicPath.replace(/^\//, ""));
  return fs.existsSync(fullPath);
}

function pickExisting(paths) {
  for (const p of paths) {
    if (fileExists(p)) return p;
  }
  return "/product-images/default-plc.png";
}

function getImage(product) {
  const brand = String(product.brand || "").toLowerCase();
  const model = String(product.model || "").toUpperCase();

  if (brand.includes("allen")) {
    if (model.startsWith("1756")) {
      return pickExisting([
        "/product-images/real/allen-bradley/ab-control-logix.jpg",
        "/product-images/real/allen-bradley/ab-module.jpg",
      ]);
    }

    if (model.startsWith("1769")) {
      return pickExisting([
        "/product-images/real/allen-bradley/ab-compact-logix.jpg",
        "/product-images/real/allen-bradley/ab-module.jpg",
      ]);
    }

    if (model.includes("PANEL") || model.includes("2711")) {
      return pickExisting([
        "/product-images/real/allen-bradley/ab-panelview.jpg",
        "/product-images/real/allen-bradley/ab-module.jpg",
      ]);
    }

    return pickExisting([
      "/product-images/real/allen-bradley/ab-module.jpg",
      "/product-images/real/allen-bradley/ab-control-logix.jpg",
    ]);
  }

  if (brand.includes("siemens")) {
    if (model.startsWith("6ES7")) {
      return pickExisting([
        "/product-images/real/siemens/siemens-s7-300.jpg",
        "/product-images/real/siemens/siemens-module.jpg",
      ]);
    }

    if (model.startsWith("6AV")) {
      return pickExisting([
        "/product-images/real/siemens/siemens-hmi.jpg",
        "/product-images/real/siemens/siemens-module.jpg",
      ]);
    }

    if (model.startsWith("6GK")) {
      return pickExisting([
        "/product-images/real/siemens/siemens-et200.jpg",
        "/product-images/real/siemens/siemens-module.jpg",
      ]);
    }

    return pickExisting([
      "/product-images/real/siemens/siemens-module.jpg",
      "/product-images/real/siemens/siemens-s7-300.jpg",
    ]);
  }

  if (brand.includes("schneider")) {
    if (model.startsWith("BMX")) {
      return pickExisting([
        "/product-images/real/schneider/schneider-m340.jpg",
        "/product-images/real/schneider/schneider-module.jpg",
      ]);
    }

    if (model.startsWith("BME")) {
      return pickExisting([
        "/product-images/real/schneider/schneider-m580.jpg",
        "/product-images/real/schneider/schneider-module.jpg",
      ]);
    }

    if (model.startsWith("140")) {
      return pickExisting([
        "/product-images/real/schneider/schneider-modicon.jpg",
        "/product-images/real/schneider/schneider-module.jpg",
      ]);
    }

    return pickExisting([
      "/product-images/real/schneider/schneider-module.jpg",
      "/product-images/real/schneider/schneider-modicon.jpg",
    ]);
  }

  if (brand.includes("abb")) {
    if (model.includes("PM") || model.includes("AC800")) {
      return pickExisting([
        "/product-images/real/abb/abb-ac800m.jpg",
        "/product-images/real/abb/abb-plc.jpg",
      ]);
    }

    if (model.includes("ACS") || model.includes("DRIVE")) {
      return pickExisting([
        "/product-images/real/abb/abb-drive.jpg",
        "/product-images/real/abb/abb-module.jpg",
      ]);
    }

    return pickExisting([
      "/product-images/real/abb/abb-module.jpg",
      "/product-images/real/abb/abb-plc.jpg",
    ]);
  }

  return product.image || "/product-images/default-plc.png";
}

let updated = 0;
let fallback = 0;

for (const product of products) {
  const newImage = getImage(product);

  if (newImage.includes("default-plc")) {
    fallback++;
  }

  if (product.image !== newImage) {
    product.image = newImage;
    updated++;
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf8");

console.log("Product Image Mapper PRO MAX v3 finished");
console.log("Updated:", updated);
console.log("Fallback default images:", fallback);
console.log("Total:", products.length);