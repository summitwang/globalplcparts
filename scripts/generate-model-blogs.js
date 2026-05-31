const fs = require("fs");
const path = require("path");

const productsPath = path.join(__dirname, "../data/products.json");
const blogPath = path.join(__dirname, "../data/blog-posts.ts");

const TARGET_BLOGS = 300;
const today = "2026-05-31";

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function loadProducts() {
  return JSON.parse(fs.readFileSync(productsPath, "utf8"));
}

function extractExistingPostsFile() {
  if (!fs.existsSync(blogPath)) return [];
  const raw = fs.readFileSync(blogPath, "utf8");

  const matches = raw.matchAll(
    /slug:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?(?:description|excerpt):\s*"([^"]+)"[\s\S]*?date:\s*"([^"]+)"/g
  );

  const posts = [];

  for (const match of matches) {
    posts.push({
      slug: match[1],
      title: match[2],
      category: match[3],
      excerpt: match[4],
      description: match[4],
      date: match[5],
    });
  }

  return posts;
}

function makeBlogPostsFromProducts(products) {
  const posts = [];

  const templates = [
    {
      suffix: "datasheet-guide",
      title: (p) => `${p.brand} ${p.model} Datasheet Guide`,
      desc: (p) =>
        `Technical overview, applications and sourcing guide for ${p.brand} ${p.model} ${p.category}.`,
    },
    {
      suffix: "supplier-guide",
      title: (p) => `${p.brand} ${p.model} Supplier Guide`,
      desc: (p) =>
        `How to source ${p.brand} ${p.model} industrial automation spare parts with worldwide RFQ support.`,
    },
    {
      suffix: "price-and-stock",
      title: (p) => `${p.brand} ${p.model} Price and Stock Guide`,
      desc: (p) =>
        `Request pricing, stock availability and lead time for ${p.brand} ${p.model} automation parts.`,
    },
  ];

  for (const product of products) {
    if (posts.length >= TARGET_BLOGS) break;

    for (const template of templates) {
      if (posts.length >= TARGET_BLOGS) break;

      const title = template.title(product);
      const slug = slugify(`${product.brand}-${product.model}-${template.suffix}`);

      posts.push({
        slug,
        title,
        category: product.brand,
        excerpt: template.desc(product),
        description: template.desc(product),
        date: today,
      });
    }
  }

  return posts;
}

function uniquePosts(posts) {
  const seen = new Set();
  const result = [];

  for (const post of posts) {
    if (!post.slug) continue;
    if (seen.has(post.slug)) continue;

    seen.add(post.slug);
    result.push(post);
  }

  return result;
}

function writeBlogPosts(posts) {
  const content = `export const blogPosts = ${JSON.stringify(posts, null, 2)};\n`;

  fs.writeFileSync(blogPath, content, "utf8");
}

function main() {
  const products = loadProducts();
  const existingPosts = extractExistingPostsFile();
  const generatedPosts = makeBlogPostsFromProducts(products);

  const mergedPosts = uniquePosts([
    ...existingPosts,
    ...generatedPosts,
  ]).slice(0, TARGET_BLOGS);

  writeBlogPosts(mergedPosts);

  console.log("✅ Blog Expansion PRO MAX completed");
  console.log("Existing posts:", existingPosts.length);
  console.log("Generated model posts:", generatedPosts.length);
  console.log("Final blog posts:", mergedPosts.length);
  console.log("Saved to:", blogPath);
}

main();