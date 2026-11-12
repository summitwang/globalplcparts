import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { createCatalogReader } from './lib/catalog-cache';
import { blogPosts } from './data/blog-posts';
// 仅大写公开详情路径进入本层；在 ISR 缓存前返回唯一 308，避免大小写缓存碰撞。
const catalog = createCatalogReader(path.join(process.cwd(), 'data/products.json'));
const articles = new Set(blogPosts.map(post => post.slug));
export function proxy(request: NextRequest) {
  const [,kind,slug] = request.nextUrl.pathname.split('/');
  if (!slug || !/[A-Z]/.test(slug)) return NextResponse.next();
  const normalized = slug.toLowerCase();
  const exists = kind === 'products' ? catalog().bySlug.has(normalized) : articles.has(normalized);
  if (!exists) return NextResponse.next();
  return NextResponse.redirect(new URL(`/${kind}/${normalized}`, request.url), 308);
}
// 普通小写 URL、分页、搜索、API、管理后台均不匹配，避免额外执行和认证影响。
export const config = {matcher:[
  '/products/:slug([a-zA-Z0-9-]*[A-Z][a-zA-Z0-9-]*)',
  '/blog/:slug([a-zA-Z0-9-]*[A-Z][a-zA-Z0-9-]*)',
]};
