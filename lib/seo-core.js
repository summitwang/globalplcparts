/* Shared deterministic SEO policy. No filesystem, network, credentials or mutations. */
const SITE = 'https://globalplcparts.com';
const PAGE_SIZE = 48;
const CHUNK_SIZE = 5000;
const CORE = ['/', '/products', '/brands', '/blog', '/request-quote'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function canonical(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) throw new Error('Invalid canonical path');
  const url = new URL(path, SITE);
  url.hash = ''; url.search = '';
  url.pathname = url.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return url.href;
}
function pagePath(base, page = 1) { return page === 1 ? base : `${base}?page=${page}`; }
function pageNumber(value) {
  if (value === undefined) return 1;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return null;
  return Number(value);
}
function noindex(path) { return /^\/(?:admin|api|search|internal|tools|scraper)(?:\/|$)/.test(new URL(path, SITE).pathname); }
function robots() { return {rules:{userAgent:'*',allow:'/',disallow:['/admin', '/api/', '/internal/', '/tools/', '/scraper/']},sitemap:`${SITE}/sitemap.xml`}; }
function validateProducts(input) {
  if (!Array.isArray(input) || !input.length) throw new Error('Catalog must be a nonempty array');
  const slugs = new Set(), identities = new Set(), brands = new Map();
  for (const p of input) {
    if (!p || ['slug','brand','brandSlug','model','category','description'].some(k=>typeof p[k] !== 'string' || !p[k].trim()) || !SLUG.test(p.slug) || !SLUG.test(p.brandSlug)) throw new Error('Malformed product record');
    const identity = `${p.brand.trim().toLowerCase()}|${p.model.trim().toLowerCase()}`;
    if (slugs.has(p.slug) || identities.has(identity)) throw new Error('Duplicate product identity or slug');
    if (brands.has(p.brandSlug) && brands.get(p.brandSlug) !== p.brand) throw new Error('Conflicting brand mapping');
    brands.set(p.brandSlug, p.brand); slugs.add(p.slug); identities.add(identity);
  }
  return [...input].sort((a,b)=>compare(a.slug,b.slug));
}
function validateBlogs(posts) {
  const seen = new Set();
  if (!Array.isArray(posts)) throw new Error('Invalid blog data');
  for (const p of posts) {
    if (!p || !SLUG.test(p.slug) || typeof p.title !== 'string' || !p.title.trim() || typeof (p.description || p.excerpt) !== 'string' || !(p.description || p.excerpt).trim() || seen.has(p.slug)) throw new Error('Malformed or duplicate blog');
    seen.add(p.slug);
  }
  return [...posts].sort((a,b)=>compare(a.slug,b.slug));
}
function brandsFor(products) {
  const map = new Map();
  for (const p of products) {
    if (!map.has(p.brandSlug)) map.set(p.brandSlug,{slug:p.brandSlug,name:p.brand,count:0});
    map.get(p.brandSlug).count++;
  }
  return [...map.values()].sort((a,b)=>compare(a.slug,b.slug));
}
function meta(title, description, path, index = true) {
  const url = new URL(path, SITE).href;
  return {title,description,alternates:{canonical:url},robots:{index,follow:true},openGraph:{title,description,url,siteName:'GlobalPLCParts',type:'website'},twitter:{card:'summary',title,description}};
}
function productMeta(p) { return meta(`${p.brand} ${p.model} | Industrial Automation Part | GlobalPLCParts`, `Request sourcing support for ${p.brand} ${p.model}. Send quantity and destination to GlobalPLCParts to check availability and quotation details.`, `/products/${p.slug}`); }
function brandMeta(b,page=1) { return meta(`${b.name} Automation Parts${page>1?` | Page ${page}`:''} | GlobalPLCParts`, `Browse ${b.name} automation parts${page>1?`, page ${page},`:''} and request maintenance or replacement sourcing support from GlobalPLCParts. Confirm the exact model in your RFQ.`,pagePath(`/brands/${b.slug}`,page)); }
function blogMeta(p) { return meta(`${p.title} | GlobalPLCParts Blog`,p.description || p.excerpt,`/blog/${p.slug}`); }
function coreMeta(path,page=1) {
  const text = {
    '/':['GlobalPLCParts | Industrial Automation Parts','Source industrial automation spare parts with GlobalPLCParts. Browse brands and models and request a quotation for maintenance and replacement sourcing.'],
    '/products':['Industrial Automation Parts','Browse industrial automation parts by model and brand. Request sourcing support and confirm availability through a quotation.'],
    '/brands':['Industrial Automation Brands','Browse automation parts by brand and find models for maintenance and replacement sourcing with GlobalPLCParts.'],
    '/blog':['Industrial Automation Blog','Read industrial automation articles and sourcing guides from GlobalPLCParts.'],
    '/request-quote':['Request a Quotation','Send your model, quantity and destination to GlobalPLCParts to request industrial automation part sourcing and quotation details.']
  }[path];
  if (!text) throw new Error('Unknown core route');
  const metadata = meta(`${text[0]}${page>1?` | Page ${page}`:''}${path==='/'?'':' | GlobalPLCParts'}`,`${text[1]}${page>1?` Page ${page}.`:''}`,pagePath(path,page));
  // Next 16 reduces a root URL to its origin when metadataBase is set.
  // Home uses only absolute URLs, so null preserves the explicit root slash.
  if(path==='/') metadata.metadataBase=null;
  return metadata;
}
function safeJson(value) { return JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'); }
function breadcrumbs(items) { return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map(([name,path],i)=>({'@type':'ListItem',position:i+1,name,item:canonical(path)}))}; }
function productSchema(p) { return {'@context':'https://schema.org','@type':'Product',name:`${p.brand} ${p.model}`,description:productMeta(p).description,mpn:p.model,brand:{'@type':'Brand',name:p.brand},category:p.category,url:canonical(`/products/${p.slug}`)}; }
function blogSchema(p) { return {'@context':'https://schema.org','@type':'BlogPosting',headline:p.title,description:p.description||p.excerpt,...(/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(Date.parse(p.date))?{datePublished:p.date}:{}),publisher:{'@type':'Organization',name:'GlobalPLCParts',url:SITE},mainEntityOfPage:canonical(`/blog/${p.slug}`)}; }
function homeSchema() { return [{'@context':'https://schema.org','@type':'Organization',name:'GlobalPLCParts',url:canonical('/')},{'@context':'https://schema.org','@type':'WebSite',name:'GlobalPLCParts',url:canonical('/')}]; }
function imageAlt(brand,model) { return `${brand?.trim() || 'Industrial'} ${model?.trim() || 'Product'}`; }
function inventory(rawProducts,rawBlogs) {
  const products=validateProducts(rawProducts), blogs=validateBlogs(rawBlogs), brands=brandsFor(products);
  const core=CORE.map(path=>({path,type:'core',metadata:coreMeta(path)}));
  for (let page=2;page<=Math.ceil(products.length/PAGE_SIZE);page++) core.push({path:pagePath('/products',page),type:'core',metadata:coreMeta('/products',page)});
  const brandPages=[];
  for (const b of brands) for(let page=1;page<=Math.ceil(b.count/PAGE_SIZE);page++) brandPages.push({path:pagePath(`/brands/${b.slug}`,page),type:page===1?'brand':'brandPagination',metadata:brandMeta(b,page)});
  const records=[...core,...brandPages,...blogs.map(p=>({path:`/blog/${p.slug}`,type:'blog',metadata:blogMeta(p)})),...products.map(p=>({path:`/products/${p.slug}`,type:'product',metadata:productMeta(p)}))];
  return {products,blogs,brands,records};
}
function sitemapGroups(inv) {
  const groups={'core.xml':[], 'brands.xml':[], 'blog.xml':[]};
  for(const r of inv.records) {
    const name=r.type==='product'?`products-${Math.floor((groups._productCount || 0)/CHUNK_SIZE)+1}.xml`:r.type==='blog'?'blog.xml':r.type==='brand'||r.type==='brandPagination'?'brands.xml':'core.xml';
    if(r.type==='product') groups._productCount=(groups._productCount||0)+1;
    (groups[name] ||= []).push(new URL(r.path,SITE).href);
  }
  delete groups._productCount;
  return groups;
}
function xmlEscape(value) { return String(value).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); }
function xmlDocument(urls,index=false) {
  if(urls.length>50000 || new Set(urls).size!==urls.length) throw new Error('Sitemap URL limit or duplicates');
  for(const url of urls) if(new URL(url).origin!==SITE || noindex(url)) throw new Error('Invalid sitemap URL');
  const root=index?'sitemapindex':'urlset',tag=index?'sitemap':'url';
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<${tag}><loc>${xmlEscape(url)}</loc></${tag}>`).join('')}</${root}>`;
  if(new TextEncoder().encode(xml).length>50*1024*1024) throw new Error('Sitemap byte limit');
  return xml;
}
module.exports={SITE,PAGE_SIZE,CHUNK_SIZE,CORE,canonical,pagePath,pageNumber,noindex,robots,validateProducts,validateBlogs,brandsFor,meta,productMeta,brandMeta,blogMeta,coreMeta,safeJson,breadcrumbs,productSchema,blogSchema,homeSchema,imageAlt,inventory,sitemapGroups,xmlEscape,xmlDocument};
