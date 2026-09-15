import { readProducts } from '@/lib/catalog-server';
import { blogPosts } from '@/data/blog-posts';
import { inventory, sitemapGroups, xmlDocument, SITE } from '@/lib/seo-core';
export const dynamic = 'force-dynamic';
export function GET() {
  try {
    const products = readProducts();
    const groups = sitemapGroups(inventory(products, blogPosts));
    return new Response(xmlDocument(Object.keys(groups).map(name => `${SITE}/sitemaps/${name}`), true), {headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-cache'}});
  } catch { return new Response('Catalog snapshot unavailable', {status:503,headers:{'X-Robots-Tag':'noindex','Retry-After':'300'}}); }
}
