import type { MetadataRoute } from "next";
import { products } from "@/data/products";

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
  ];
}