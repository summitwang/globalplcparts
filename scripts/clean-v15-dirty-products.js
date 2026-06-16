const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");
const DRY_RUN = process.argv.includes("--dry-run");

function isDirtyV15Product(p) {
  const brand = String(p.brand || "").toLowerCase();
  const source = String(p.source || "").toLowerCase();
  const sourceUrl = String(p.sourceUrl || "").toLowerCase();
  const model = String(p.model || "").toUpperCase();

  if (source !== "classicautomation") return false;

  if (brand.includes("allen bradley") && sourceUrl.includes("/parts/abb/")) return true;
  if (brand.includes("allen bradley") && model.startsWith("ABB-")) return true;

  if (brand === "abb" && sourceUrl.includes("/parts/allen-bradley/")) return true;
  if (brand === "abb" && model.startsWith("ALLEN-BRADLEY-")) return true;

  return false;
}

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const dirty = products.filter(isDirtyV15Product);
  const clean = products.filter((p) => !isDirtyV15Product(p));

  console.log("Clean V15 Dirty Products");
  console.log("Original:", products.length);
  console.log("Dirty found:", dirty.length);
  console.log("After clean:", clean.length);
  console.log("Dry run:", DRY_RUN ? "YES" : "NO");

  console.log("Dirty preview:");
  console.log(
    dirty.slice(0, 30).map((p) => ({
      brand: p.brand,
      model: p.model,
      slug: p.slug,
      sourceUrl: p.sourceUrl,
    }))
  );

  if (!DRY_RUN) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(clean, null, 2), "utf8");
    console.log("products.json cleaned.");
  }
}

main();