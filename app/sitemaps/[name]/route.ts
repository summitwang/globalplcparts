import { readProducts } from '@/lib/catalog-server';
import { blogPosts } from '@/data/blog-posts';
import { inventory, sitemapGroups, xmlDocument } from '@/lib/seo-core';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, {params}: {params: Promise<{name:string}>}) {
  const {name} = await params;
  if (!/^(core|brands|blog|products-[1-9]\d*)\.xml$/.test(name)) return new Response('Not found',{status:404});
  try {
    const groups = sitemapGroups(inventory(readProducts(),blogPosts));
    const urls = groups[name];
    if (!urls) return new Response('Not found',{status:404});
    return new Response(xmlDocument(urls),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-cache'}});
  } catch { return new Response('Catalog snapshot unavailable',{status:503,headers:{'X-Robots-Tag':'noindex','Retry-After':'300'}}); }
}
