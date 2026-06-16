const axios = require("axios");
const cheerio = require("cheerio");

// =========================
// 1. MODEL PARSER (AI SIMULATION)
// =========================
function parseModel(model, brand) {
  const map = {
    "allen bradley": "PLC controller industrial module",
    "siemens": "industrial automation PLC module",
    "abb": "industrial drive controller module",
    "schneider": "industrial automation control module",
    "omron": "automation sensor controller module",
  };

  return {
    query: `${brand} ${model} ${map[brand.toLowerCase()] || "industrial automation module"}`
  };
}

// =========================
// 2. IMAGE FETCHER (MULTI SOURCE)
// =========================
async function fetchImages(query) {
  const sources = [];

  // ---- Bing Images ----
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, { timeout: 10000 });

    const $ = cheerio.load(res.data);

    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("http")) {
        sources.push(src);
      }
    });
  } catch (e) {}

  // ---- fallback heuristic ----
  return sources;
}

// =========================
// 3. IMAGE VALIDATION ENGINE
// =========================
function validate(img) {
  if (!img) return false;
  if (img.includes("logo")) return false;
  if (img.includes("icon")) return false;
  if (img.length < 20) return false;
  return true;
}

// =========================
// 4. BEST IMAGE SELECTOR (AI CORE)
// =========================
function rankImages(images, model) {
  return images
    .filter(validate)
    .sort((a, b) => {
      // simple heuristic scoring
      const scoreA = a.includes(model) ? 2 : 1;
      const scoreB = b.includes(model) ? 2 : 1;
      return scoreB - scoreA;
    });
}

// =========================
// 5. MAIN ENGINE
// =========================
async function resolveAIImage(product) {
  const { brand, model } = product;

  // STEP 1: AI query build
  const aiQuery = parseModel(model, brand);

  // STEP 2: fetch multi-source images
  const images = await fetchImages(aiQuery.query);

  // STEP 3: rank best match
  const ranked = rankImages(images, model);

  if (ranked.length > 0) {
    return {
      image: ranked[0],
      source: "ai-multi-source"
    };
  }

  // STEP 4: fallback local
  return {
    image: `/product-images/placeholder/${brand}.jpg`,
    source: "local-fallback"
  };
}

// =========================
// 6. BATCH RUN
// =========================
async function run(products) {
  const result = [];

  for (const p of products) {
    console.log(`AI resolving: ${p.brand} ${p.model}`);

    const img = await resolveAIImage(p);

    result.push({
      ...p,
      image: img.image,
      imageSource: img.source
    });
  }

  require("fs").writeFileSync(
    "./data/products-v8-1.json",
    JSON.stringify(result, null, 2)
  );

  console.log("V8.1 AI IMAGE ENGINE DONE");
}

module.exports = { run };