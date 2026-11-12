import { readSitemapGroups } from '@/lib/sitemap-server';
import { xmlDocument, SITE } from '@/lib/seo-core';
export const dynamic = 'force-dynamic';
export function GET() {
  try {
    const groups = readSitemapGroups();
    return new Response(xmlDocument(Object.keys(groups).map(name => `${SITE}/sitemaps/${name}`), true), {headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600, stale-while-revalidate=60'}});
  } catch { return new Response('Catalog snapshot unavailable', {status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','Retry-After':'300'}}); }
}
