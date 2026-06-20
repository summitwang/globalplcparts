const fs = require("fs");
const path = require("path");

const LIMIT = Number(process.argv[2] || 500);

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const REAL_DIR = path.join(PUBLIC_DIR, "product-images", "real");

const BRAND_FALLBACK = {
  "Allen Bradley": "/product-images/allen-bradley.svg",
  ABB: "/product-images/abb.svg",
  Siemens: "/product-images/siemens.svg",
  Schneider: "/product-images/schneider.svg",
  Omron: "/product-images/omron.svg",
  Mitsubishi: "/product-images/mitsubishi.svg",
  Honeywell: "/product-images/honeywell.svg",
  Yokogawa: "/product-images/yokogawa.svg",
  Emerson: "/product-images/emerson.svg",
  "GE Fanuc": "/product-images/ge-fanuc.svg",
  "Bently Nevada": "/product-images/bently-nevada.svg",
  Foxboro: "/product-images/foxboro.svg",
  HIMA: "/product-images/hima.svg",
  Bachmann: "/product-images/bachmann.svg",
  Rexroth: "/product-images/rexroth.svg",
  ProSoft: "/product-images/prosoft.svg",
  Woodward: "/product-images/woodward.svg",
};

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function fileExists(publicPath) {
  if (!publicPath || !publicPath.startsWith("/")) return false;
  return fs.existsSync(path.join(PUBLIC_DIR, publicPath.replace(/^\//, "")));
}

function needsFix(product) {
  const img = String(product.image || "").trim();
  if (!img) return true;
  if (img.endsWith(".svg")) return true;
  if (img.includes("undefined") || img.includes("null")) return true;
  if (img.startsWith("http")) return true;
  if (!fileExists(img)) return true;
  return false;
}

function getSeriesKeys(brand, model) {
  const m = String(model || "").toUpperCase();
  const keys = [];

  if (brand === "Allen Bradley") {
    if (m.startsWith("1756")) keys.push("1756");
    if (m.startsWith("1769")) keys.push("1769");
    if (m.startsWith("1746")) keys.push("1746");
    if (m.startsWith("1734")) keys.push("1734");
    if (m.startsWith("2711")) keys.push("2711");
    if (m.startsWith("20")) keys.push("20");
    if (m.startsWith("22")) keys.push("22");
  }

  if (brand === "Siemens") {
    if (m.startsWith("6ES7")) keys.push("6ES7");
    if (m.startsWith("6AV")) keys.push("6AV");
    if (m.startsWith("6SL")) keys.push("6SL");
    if (m.startsWith("3RT")) keys.push("3RT");
  }

  if (brand === "ABB") {
    if (m.startsWith("ACS")) keys.push("ACS");
    if (m.startsWith("DSQC")) keys.push("DSQC");
    if (m.startsWith("PM")) keys.push("PM");
    if (m.startsWith("AI")) keys.push("AI");
    if (m.startsWith("AO")) keys.push("AO");
    if (m.startsWith("DI")) keys.push("DI");
    if (m.startsWith("DO")) keys.push("DO");
  }

  const firstDash = m.split("-")[0];
  if (firstDash && firstDash.length >= 3) keys.push(firstDash);

  const first4 = m.slice(0, 4);
  if (first4.length >= 3) keys.push(first4);

  const first3 = m.slice(0, 3);
  if (first3.length >= 3) keys.push(first3);

  return Array.from(new Set(keys));
}

function collectRealImages(products) {
  const images = [];

  for (const p of products) {
    const img = String(p.image || "").trim();
    if (!img || img.endsWith(".svg")) continue;
    if (!img.startsWith("/product-images/real/")) continue;
    if (!fileExists(img)) continue;

    images.push({
      brand: p.brand,
      model: p.model,
      image: img,
      slugImage: slugify(img),
      slugModel: slugify(p.model),
    });
  }

  return images;
}

function findSeriesImage(product, realImages) {
  const brand = product.brand;
  const model = String(product.model || "");
  const keys = getSeriesKeys(brand, model);

  const sameBrand = realImages.filter((x) => x.brand === brand);

  for (const key of keys) {
    const k = slugify(key);

    const found =
      sameBrand.find((x) => x.slugModel.startsWith(k)) ||
      sameBrand.find((x) => x.slugImage.includes(k));

    if (found) return found.image;
  }

  if (sameBrand.length > 0) return sameBrand[0].image;

  return BRAND_FALLBACK[brand] || "/product-images/default.svg";
}

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));
  const realImages = collectRealImages(products);

  let fixed = 0;
  let svgUsed = 0;
  let checked = 0;

  console.log("Product Image Engine PRO MAX V22 started");
  console.log("Total products:", products.length);
  console.log("Real image library:", realImages.length);
  console.log("Limit:", LIMIT);

  for (const product of products) {
    if (checked >= LIMIT) break;
    if (!needsFix(product)) continue;

    checked++;

    const newImage = findSeriesImage(product, realImages);

    product.image = newImage;
    product.imageSource = newImage.endsWith(".svg")
      ? "BrandFallback"
      : "SeriesMatchV22";

    if (newImage.endsWith(".svg")) {
      svgUsed++;
    } else {
      fixed++;
    }

    console.log(
      `${product.brand} ${product.model} -> ${newImage}`
    );
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");

  console.log("\nV22 Finished");
  console.log("Checked:", checked);
  console.log("Series image fixed:", fixed);
  console.log("SVG fallback used:", svgUsed);
}

main();