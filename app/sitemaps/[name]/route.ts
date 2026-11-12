import { readSitemapGroups } from '@/lib/sitemap-server';
import { xmlDocument } from '@/lib/seo-core';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, {params}: {params: Promise<{name:string}>}) {
  const {name} = await params;
  if (!/^(core|brands|blog|products-[1-9]\d*)\.xml$/.test(name)) return new Response('Not found',{status:404});
  try {
    const groups = readSitemapGroups();
    const urls = groups[name];
    if (!urls) return new Response('Not found',{status:404});
    return new Response(xmlDocument(urls),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600, stale-while-revalidate=60'}});
  } catch { return new Response('Catalog snapshot unavailable',{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','Retry-After':'300'}}); }
}
