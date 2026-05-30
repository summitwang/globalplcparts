import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { blogPosts } from "@/data/blog-posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://globalplcparts.com";

  const staticPages = [
    "",
    "/products",
    "/brands",
    "/request-quote",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  const productPages = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(),
  }));

  return [
    ...staticPages,
    ...productPages,
    {
  url: "https://globalplcparts.com/blog",
  lastModified: new Date(),
  changeFrequency: "weekly",
  priority: 0.7,
},
...blogPosts.map((post) => ({
  url: `https://globalplcparts.com/blog/${post.slug}`,
  lastModified: new Date(post.date),
  changeFrequency: "monthly",
  priority: 0.6,
})),
  ];
}