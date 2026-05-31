const fs = require("fs");
const path = require("path");

const TARGET_TOTAL = 1000;

const productsPath = path.join(__dirname, "../data/products.json");

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const brands = [
  {
    brand: "Allen Bradley",
    prefix: ["1756", "1769", "1746", "1734", "1783"],
    series: ["EN2T", "L71", "L72", "L73", "IB16", "OB16", "IF8", "OF8", "PA72"],
  },
  {
    brand: "Siemens",
    prefix: ["6ES7", "6AV", "6SL", "6GK", "3RW"],
    series: ["315-2EH14-0AB0", "321-1BL00-0AA0", "322-1BH01-0AA0", "123-1AA00", "153-1AA03"],
  },
  {
    brand: "Schneider",
    prefix: ["TSX", "BMX", "140", "M340", "XBT"],
    series: ["P57103", "DDI1602", "AMI0810", "NOE77101", "CPS11420"],
  },
  {
    brand: "ABB",
    prefix: ["07KT", "AI", "AO", "DI", "DO"],
    series: ["97", "810", "820", "830", "840"],
  },
  {
    brand: "Honeywell",
    prefix: ["CC", "MC", "MU", "TC", "TK"],
    series: ["PAIX01", "TAIX01", "TDIL01", "ODIL01", "PRS021"],
  },
  {
    brand: "Yokogawa",
    prefix: ["AAI", "AAR", "ADV", "ALR", "PW"],
    series: ["143", "543", "151", "551", "482"],
  },
  {
    brand: "Emerson",
    prefix: ["VE", "KJ", "12P", "5X", "1C"],
    series: ["3008", "3201X1", "4001X1", "1501X1", "2201X1"],
  },
  {
    brand: "Bently Nevada",
    prefix: ["3300", "3500", "3301", "3302"],
    series: ["05", "15", "22M", "42M", "60"],
  },
  {
    brand: "GE Fanuc",
    prefix: ["IC693", "IC697", "IC200", "IC695"],
    series: ["CPU374", "MDL740", "MDL645", "PWR321", "ALG223"],
  },
  {
    brand: "Mitsubishi",
    prefix: ["FX", "Q", "A", "MR", "AJ"],
    series: ["3U-32MR", "02CPU", "68AD", "J2S", "65BTB1"],
  },
  {
    brand: "Omron",
    prefix: ["CJ1", "CJ2", "CS1", "CP1", "NX"],
    series: ["CPU13", "CPU31", "ID211", "OD211", "AD081"],
  },
  {
    brand: "Foxboro",
    prefix: ["FBM", "P091", "P092", "CP"],
    series: ["201", "202", "203", "204", "270"],
  },
];

function makeDescription(brand, model) {
  return `${brand} ${model} industrial automation spare part for PLC, DCS, HMI, control system, factory maintenance and replacement applications. GlobalPLCParts supplies automation components with worldwide shipping and fast RFQ response.`;
}

function makeProduct(brand, model, index) {
  return {
    slug: slugify(`${brand}-${model}`),
    brand,
    brandSlug: slugify(brand),
    model,
    category: "Industrial Automation Parts",
    description: makeDescription(brand, model),
    image: `/product-images/${slugify(brand)}.png`,
  };
}

function loadProducts() {
  if (!fs.existsSync(productsPath)) {
    return [];
  }

  const raw = fs.readFileSync(productsPath, "utf8");
  return JSON.parse(raw);
}

function saveProducts(products) {
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf8");
}

function main() {
  const existingProducts = loadProducts();

  const seen = new Set(
    existingProducts.map((p) =>
      `${p.brand || ""}-${p.model || ""}`.toLowerCase()
    )
  );

  const newProducts = [];
  let counter = 1;

  while (existingProducts.length + newProducts.length < TARGET_TOTAL) {
    for (const item of brands) {
      for (const prefix of item.prefix) {
        for (const series of item.series) {
          if (existingProducts.length + newProducts.length >= TARGET_TOTAL) {
            break;
          }

          const suffix = String(counter).padStart(3, "0");
          const model = `${prefix}-${series}-${suffix}`;
          const key = `${item.brand}-${model}`.toLowerCase();

          if (seen.has(key)) continue;

          seen.add(key);
          newProducts.push(makeProduct(item.brand, model, counter));

          counter++;
        }
      }
    }
  }

  const mergedProducts = [...existingProducts, ...newProducts];

  saveProducts(mergedProducts);

  console.log("✅ Product expansion completed");
  console.log("Existing products:", existingProducts.length);
  console.log("New products added:", newProducts.length);
  console.log("Total products:", mergedProducts.length);
  console.log("Saved to:", productsPath);
}

main();