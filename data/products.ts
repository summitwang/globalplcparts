import productsData from "./products.json";

export type Product = {
  slug: string;
  brand: string;
  brandSlug: string;
  model: string;
  category: string;
  description: string;
  image?: string;
};

export const products = productsData as Product[];