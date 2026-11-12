import { readProducts } from './catalog-server';
import { blogPosts } from '@/data/blog-posts';
import { inventory, sitemapGroups } from './seo-core';
import type { Product } from '@/data/products';
// 同一不可变目录快照只生成一次全站清单，旧快照由 GC 回收。
const groups = new WeakMap<Product[], Record<string,string[]>>();
export function readSitemapGroups() {
  const products = readProducts();
  let result = groups.get(products);
  if (!result) { result = sitemapGroups(inventory(products, blogPosts)); groups.set(products, result); }
  return result;
}
