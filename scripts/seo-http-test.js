'use strict';
// Public loopback GETs only. Does not execute page JavaScript, analytics or forms.
const assert=require('node:assert/strict');
const cheerio=require('cheerio');
const fs=require('node:fs');
const seo=require('../lib/seo-core');
async function main(){
  const base=new URL(process.argv[2]||'http://127.0.0.1:3100');
  if(base.protocol!=='http:'||base.hostname!=='127.0.0.1'||base.pathname!=='/'||base.username||base.password)throw new Error('Only loopback HTTP origin is allowed');
  const product=JSON.parse(fs.readFileSync('data/products.json','utf8'))[0];
  let checks=0;
  const failures=[];
  const get=async path=>{const r=await fetch(new URL(path,base),{redirect:'manual',signal:AbortSignal.timeout(30000)});return {r,text:await r.text()};};
  for(const path of ['/','/products','/products?page=2','/brands','/brands/'+product.brandSlug,'/brands/'+product.brandSlug+'?page=2','/products/'+product.slug,'/blog','/blog/abb-plc-module-guide','/request-quote']){
    try {
    const {r,text}=await get(path);assert.equal(r.status,200,path);const $=cheerio.load(text);assert.equal($('h1').length,1,path+' H1');assert.equal($('link[rel=canonical]').attr('href'),seo.SITE+path,path+' canonical');assert.ok($('meta[name=description]').attr('content'),path+' description');assert.ok($('meta[property="og:url"]').attr('content'),path+' OG');assert.ok($('meta[name="twitter:card"]').attr('content'),path+' Twitter');
    $('script[type="application/ld+json"]').each((_,el)=>{const data=JSON.parse($(el).text());for(const item of Array.isArray(data)?data:[data])if(item['@type']==='Product')assert.ok(!item.offers);});
    if(path.includes('page=2'))assert.ok($('nav[aria-label="Product pagination"] a').length>0);
    checks++;
    } catch (error) { failures.push(error.message); }
  }
  for(const path of ['/products/seo-not-a-real-product-xyz','/brands/seo-not-a-real-brand-xyz','/blog/seo-not-a-real-post-xyz','/products?page=999999','/products?page=0','/brands/abb?page=999999']){const {r,text}=await get(path);assert.equal(r.status,404,path);const $=cheerio.load(text);assert.match($('meta[name=robots]').map((_,el)=>$(el).attr('content')).get().join(','),/noindex/);checks++;}
  for(const [path,target]of [['/products/'+product.slug.toUpperCase(),'/products/'+product.slug],['/brands/ABB','/brands/abb'],['/blog/ABB-PLC-MODULE-GUIDE','/blog/abb-plc-module-guide'],['/products?page=1','/products'],['/products/','/products']]){const {r}=await get(path);assert.equal(r.status,308,path);assert.equal(new URL(r.headers.get('location'),base).pathname,target);checks++;}
  const search=await get('/search?q=ABB');assert.equal(search.r.status,200);assert.match(search.r.headers.get('x-robots-tag'),/noindex/);checks++;
  const robot=await get('/robots.txt');assert.equal(robot.r.status,200);assert.match(robot.text,/Disallow: \/admin/);assert.match(robot.text,/Allow: \//);assert.match(robot.text,/Sitemap: https:\/\/globalplcparts.com\/sitemap.xml/);checks++;
  const index=await get('/sitemap.xml');assert.equal(index.r.status,200);const $=cheerio.load(index.text,{xml:true});assert.equal($('sitemapindex').length,1);
  const seen=new Set();let productChunks=0;
  for(const el of $('sitemap loc').toArray()){
    const url=new URL($(el).text());assert.equal(url.origin,seo.SITE);const child=await get(url.pathname);assert.equal(child.r.status,200);const xml=cheerio.load(child.text,{xml:true});assert.equal(xml('urlset').length,1);assert.ok(xml('loc').length<=50000);assert.doesNotMatch(child.text,/<lastmod>/);
    if(url.pathname.includes('products-')){productChunks++;assert.ok(xml('loc').length<=seo.CHUNK_SIZE);}
    for(const loc of xml('loc').toArray()){const value=xml(loc).text();assert.equal(new URL(value).origin,seo.SITE);assert.ok(!seo.noindex(value));assert.ok(!seen.has(value),'duplicate sitemap URL');seen.add(value);}
    checks++;
  }
  assert.ok(seen.has(seo.SITE+'/products/'+product.slug));assert.ok(productChunks>=3);assert.equal((await get('/sitemaps/products-999999.xml')).r.status,404);
  if(failures.length)throw new Error(failures.join('\n'));
  console.log(JSON.stringify({result:'PASS',checks,sitemapURLs:seen.size,productChunks,basis:'Local production server; no external HTTP or client JavaScript'},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
