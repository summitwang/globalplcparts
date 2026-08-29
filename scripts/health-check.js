"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const BLOG_PATH = path.join(ROOT, "data", "blog-posts.ts");
const PUBLIC_PATH = path.join(ROOT, "public");

const results = [];

function relative(filePath) {
  return path.relative(ROOT, filePath).replaceAll("\\", "/");
}

function add(level, check, detail) {
  results.push({ level, check, detail });
}

function pass(check, detail) {
  add("PASS", check, detail);
}

function warn(check, detail) {
  add("WARN", check, detail);
}

function fail(check, detail) {
  add("FAIL", check, detail);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function listSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(entryPath));
    } else if (/\.(?:js|ts|tsx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

function checkGitSafety() {
  try {
    const output = execFileSync("git", ["status", "--short"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    if (!output) {
      pass("Git safety", "Working tree is clean.");
      return;
    }

    const lines = output.split(/\r?\n/);
    warn(
      "Git safety",
      `Working tree has ${lines.length} changed or untracked path(s); nothing was cleaned or reset.`
    );
    for (const line of lines.slice(0, 20)) {
      console.log(`  GIT  ${line}`);
    }
    if (lines.length > 20) {
      console.log(`  GIT  ... ${lines.length - 20} more path(s)`);
    }
  } catch (error) {
    warn("Git safety", `Git status could not be read: ${error.message}`);
  }
}

function checkCatalogAndImages() {
  let products;
  try {
    products = JSON.parse(readText(PRODUCTS_PATH));
  } catch (error) {
    fail("Product catalog", `Cannot parse ${relative(PRODUCTS_PATH)}: ${error.message}`);
    return;
  }

  if (!Array.isArray(products)) {
    fail("Product catalog", `${relative(PRODUCTS_PATH)} must contain a JSON array.`);
    return;
  }

  const requiredFields = ["slug", "brand", "model", "category"];
  const missingByField = Object.fromEntries(requiredFields.map((field) => [field, 0]));
  const slugCounts = new Map();
  const brands = new Set();
  const imageCounts = new Map();
  const missingImages = [];
  let fallbackImages = 0;
  let remoteImages = 0;

  for (const product of products) {
    for (const field of requiredFields) {
      if (typeof product?.[field] !== "string" || !product[field].trim()) {
        missingByField[field] += 1;
      }
    }

    if (typeof product?.slug === "string" && product.slug.trim()) {
      slugCounts.set(product.slug, (slugCounts.get(product.slug) || 0) + 1);
    }
    if (typeof product?.brand === "string" && product.brand.trim()) {
      brands.add(product.brand);
    }

    const image = typeof product?.image === "string" ? product.image.trim() : "";
    if (!image) {
      missingImages.push({ slug: product?.slug || "(unknown)", image: "(empty)" });
      continue;
    }

    imageCounts.set(image, (imageCounts.get(image) || 0) + 1);
    if (/^https?:\/\//i.test(image)) {
      remoteImages += 1;
      continue;
    }

    if (!image.startsWith("/")) {
      missingImages.push({ slug: product?.slug || "(unknown)", image });
      continue;
    }

    if (/\/(?:default|[^/]+)\.svg$/i.test(image)) {
      fallbackImages += 1;
    }

    const localPath = path.join(PUBLIC_PATH, image.replace(/^\/+/, ""));
    if (!fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) {
      missingImages.push({ slug: product?.slug || "(unknown)", image });
    }
  }

  const duplicateSlugs = [...slugCounts.entries()].filter(([, count]) => count > 1);
  const missingFieldTotal = Object.values(missingByField).reduce((sum, count) => sum + count, 0);

  if (missingFieldTotal > 0) {
    fail("Product required fields", JSON.stringify(missingByField));
  } else {
    pass("Product required fields", "Every product has slug, brand, model, and category.");
  }

  if (duplicateSlugs.length > 0) {
    fail("Product slugs", `${duplicateSlugs.length} duplicate slug group(s) found.`);
  } else {
    pass("Product slugs", "No duplicate product slugs found.");
  }

  pass("Product catalog", `${products.length} products across ${brands.size} brands parsed successfully.`);

  if (missingImages.length > 0) {
    fail("Product images", `${missingImages.length} missing, empty, or invalid local image reference(s).`);
    for (const item of missingImages.slice(0, 10)) {
      console.log(`  IMAGE ${item.slug}: ${item.image}`);
    }
  } else {
    pass("Product images", "All referenced local product image files exist.");
  }

  if (remoteImages > 0) {
    warn("Remote product images", `${remoteImages} product(s) reference remote image URLs.`);
  } else {
    pass("Remote product images", "No product records reference remote image URLs.");
  }

  if (fallbackImages > 0) {
    warn("Image fallbacks", `${fallbackImages} product(s) use SVG/default fallback paths.`);
  } else {
    pass("Image fallbacks", "No catalog records directly use SVG/default fallback paths.");
  }

  const heavilyReused = [...imageCounts.entries()]
    .filter(([, count]) => count >= 20)
    .sort((a, b) => b[1] - a[1]);

  if (heavilyReused.length > 0) {
    warn(
      "Image reuse",
      `${heavilyReused.length} image path(s) are referenced by at least 20 products; ${imageCounts.size} unique paths total.`
    );
    for (const [image, count] of heavilyReused.slice(0, 10)) {
      console.log(`  REUSE ${count}x ${image}`);
    }
  } else {
    pass("Image reuse", `No image path is referenced by 20 or more products; ${imageCounts.size} unique paths total.`);
  }
}

function parseBlogPosts() {
  const source = readText(BLOG_PATH).trim();
  const prefix = "export const blogPosts =";
  if (!source.startsWith(prefix)) {
    throw new Error(`Expected ${relative(BLOG_PATH)} to start with "${prefix}".`);
  }

  let json = source.slice(prefix.length).trim();
  if (json.endsWith(";")) json = json.slice(0, -1).trim();
  return JSON.parse(json);
}

function checkBlog() {
  let posts;
  try {
    posts = parseBlogPosts();
  } catch (error) {
    fail("Blog source", `Cannot safely parse ${relative(BLOG_PATH)}: ${error.message}`);
    return;
  }

  if (!Array.isArray(posts)) {
    fail("Blog source", `${relative(BLOG_PATH)} does not contain an array.`);
    return;
  }

  const slugCounts = new Map();
  let missingSlugs = 0;
  for (const post of posts) {
    const slug = typeof post?.slug === "string" ? post.slug.trim() : "";
    if (!slug) {
      missingSlugs += 1;
    } else {
      slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
    }
  }

  const duplicates = [...slugCounts.values()].filter((count) => count > 1).length;
  if (missingSlugs || duplicates) {
    fail("Blog slugs", `${missingSlugs} missing slug(s); ${duplicates} duplicate slug group(s).`);
  } else {
    pass("Blog slugs", "No missing or duplicate blog slugs found.");
  }
  pass("Blog source", `${posts.length} blog posts parsed as data without executing the TypeScript module.`);
}

function checkFiles(label, paths) {
  const missing = paths.filter((item) => !fs.existsSync(path.join(ROOT, item)));
  if (missing.length > 0) {
    fail(label, `Missing: ${missing.join(", ")}`);
  } else {
    pass(label, `${paths.length} required path(s) exist.`);
  }
}

function checkArchitecture() {
  checkFiles("Public route structure", [
    "app/page.tsx",
    "app/products/page.tsx",
    "app/brands/page.tsx",
    "app/search/page.tsx",
    "app/blog/page.tsx",
    "app/request-quote/page.tsx",
  ]);
  checkFiles("Dynamic route structure", [
    "app/products/[slug]/page.tsx",
    "app/brands/[slug]/page.tsx",
    "app/blog/[slug]/page.tsx",
  ]);
  checkFiles("SEO handlers", ["app/robots.ts", "app/sitemap.ts"]);
  checkFiles("RFQ route structure", [
    "app/api/rfq/route.ts",
    "app/api/rfq/quote/route.ts",
    "app/api/admin/rfq/route.ts",
  ]);
  pass("RFQ isolation", "Route files were checked for existence only; no RFQ, Supabase, or Resend operation was called.");
}

function checkEnvironmentNames() {
  const expected = [
    "ADMIN_PASSWORD",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "RESEND_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_URL",
  ];
  const found = new Set();
  const roots = ["app", "components", "lib", "scripts"];

  for (const root of roots) {
    for (const file of listSourceFiles(path.join(ROOT, root))) {
      const source = readText(file);
      for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        found.add(match[1]);
      }
    }
  }

  const missing = expected.filter((name) => !found.has(name));
  if (missing.length > 0) {
    warn("Environment names", `Expected source reference(s) not found: ${missing.join(", ")}`);
  } else {
    pass("Environment names", `Expected names: ${expected.join(", ")}`);
  }

  const extra = [...found].filter((name) => !expected.includes(name)).sort();
  if (extra.length > 0) {
    warn("Additional environment names", extra.join(", "));
  }
  pass("Secret safety", "Environment files and environment-variable values were not read.");
}

function checkScriptRisk() {
  const scriptsDir = path.join(ROOT, "scripts");
  const riskyPattern = /(scrape|import|image-(?:engine|scraper|mapper)|product-(?:expansion|image-engine)|generate|clean|fix|update|backfill)/i;
  const risky = fs
    .readdirSync(scriptsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && riskyPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (risky.length > 0) {
    warn("High-risk script families", `${risky.length} potentially mutating/networked script file(s) detected.`);
    console.log(`  RISK ${risky.join(", ")}`);
  } else {
    pass("High-risk script families", "No known high-risk script filenames detected.");
  }
  pass("Execution isolation", "The health check does not import or execute repository automation scripts.");
}

function printSummary() {
  console.log("\nGlobalPLCParts read-only health check\n");
  for (const result of results) {
    console.log(`[${result.level}] ${result.check}: ${result.detail}`);
  }

  const counts = { PASS: 0, WARN: 0, FAIL: 0 };
  for (const result of results) counts[result.level] += 1;
  console.log(`\nSummary: ${counts.PASS} PASS, ${counts.WARN} WARN, ${counts.FAIL} FAIL`);
  console.log("Read-only guarantee: no repository data, cache, report, or external service was modified by this command.");

  process.exitCode = counts.FAIL > 0 ? 1 : 0;
}

checkGitSafety();
checkCatalogAndImages();
checkBlog();
checkArchitecture();
checkEnvironmentNames();
checkScriptRisk();
printSummary();
