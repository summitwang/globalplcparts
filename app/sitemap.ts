import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { blogPosts } from "@/data/blog-posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://globalplcparts.com";
  const lastModified = new Date();

  const staticPages = [
    "",
    "/products",
    "/brands",
    "/request-quote",
    "/blog",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
  }));

  const brandSlugs = [
    ...new Set(
      products
        .map((product) => product.brandSlug)
        .filter(Boolean)
    ),
  ];

  const brandPages = brandSlugs.map((slug) => ({
    url: `${baseUrl}/brands/${slug}`,
    lastModified,
  }));

  const productPages = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified,
  }));

  const blogPages = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [
    ...staticPages,
    ...brandPages,
    ...productPages,
    ...blogPages,
  ];
}