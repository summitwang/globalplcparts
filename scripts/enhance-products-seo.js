const fs = require("fs");
const path = require("path");

const productsPath = path.join(__dirname, "../data/products.json");

function loadProducts() {
  return JSON.parse(fs.readFileSync(productsPath, "utf8"));
}

function saveProducts(products) {
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf8");
}

function main() {
  const products = loadProducts();

  const enhanced = products.map((p) => {
    const brand = p.brand || "Industrial";
    const model = p.model || "Automation Part";

    return {
      ...p,

      seoTitle:
        p.seoTitle ||
        `${brand} ${model} PLC Automation Spare Part Supplier`,

      seoDescription:
        p.seoDescription ||
        `GlobalPLCParts supplies ${brand} ${model} industrial automation spare parts for PLC, DCS, HMI, factory maintenance and replacement projects worldwide.`,

      keywords:
        p.keywords || [
          `${brand} ${model}`,
          `${brand} ${model} supplier`,
          `${brand} ${model} spare parts`,
          `${brand} PLC parts`,
          `${brand} automation parts`,
          `${model} replacement`,
          `${model} price`,
          `${model} stock`,
        ],

      availability: p.availability || "Available on request",

      warranty: p.warranty || "12 months warranty available",

      shipping: p.shipping || "Worldwide shipping supported",

      rfqText:
        p.rfqText ||
        `Request a quotation for ${brand} ${model}. Send us your required quantity and destination country for price, stock and delivery time.`,

      applications:
        p.applications || [
          "PLC control system",
          "DCS process automation",
          "Factory maintenance",
          "Production line replacement",
          "Industrial control cabinet",
          "Machine automation system",
        ],

      features:
        p.features || [
          "Industrial automation spare part",
          "Suitable for replacement and maintenance",
          "Worldwide sourcing support",
          "Fast quotation response",
          "Support for obsolete and hard-to-find parts",
        ],
    };
  });

  saveProducts(enhanced);

  console.log("✅ Product SEO enhancement completed");
  console.log("Total enhanced products:", enhanced.length);
}

main();