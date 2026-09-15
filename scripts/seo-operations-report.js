'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const seo = require('../lib/seo-core');
const ROOT = path.resolve(__dirname, '..');
const OUTPUTS = ['status.json','status.md','content-improvement.json','content-improvement.md','internal-links.json','keywords.csv'];
function parseBlogs(text) {
  const match = /^\s*export const blogPosts\s*=\s*([\s\S]*?)\s*;?\s*$/.exec(text);
  if (!match) throw new Error('Unsupported blog source format');
  return seo.validateBlogs(JSON.parse(match[1]));
}
function duplicates(records, value) {
  const groups=new Map();
  for(const r of records) {const key=String(value(r)||'').trim().toLowerCase();if(key)(groups.get(key)||groups.set(key,[]).get(key)).push(r.path);}
  return [...groups.entries()].filter(([,paths])=>paths.length>1).map(([value,paths])=>({value,paths}));
}
function linkAudit(inv,mappings) {
  const graph = new Map(inv.records.map(r=>[r.path,new Set()]));
  const broken=[];
  function edge(from,to) {if(!graph.has(from)||!graph.has(to))broken.push({from,to});else graph.get(from).add(to);}
  for(const r of inv.records) for(const core of seo.CORE) if(r.path!==core) edge(r.path,core);
  const listing=(base,products)=>{
    const pages=Math.ceil(products.length/seo.PAGE_SIZE);
    for(let page=1;page<=pages;page++) {
      const from=seo.pagePath(base,page);
      for(const p of products.slice((page-1)*seo.PAGE_SIZE,page*seo.PAGE_SIZE)) edge(from,`/products/${p.slug}`);
      for(const n of [1,pages,page-2,page-1,page+1,page+2]) if(n>0&&n<=pages&&n!==page)edge(from,seo.pagePath(base,n));
    }
  };
  listing('/products',inv.products);
  for(const b of inv.brands) {edge('/brands',`/brands/${b.slug}`);listing(`/brands/${b.slug}`,inv.products.filter(p=>p.brandSlug===b.slug));}
  for(const p of inv.products) edge(`/products/${p.slug}`,`/brands/${p.brandSlug}`);
  for(const p of inv.blogs) edge('/blog',`/blog/${p.slug}`);
  for(const m of mappings)edge(`/blog/${m.postSlug}`,m.href);
  const inbound=new Map(inv.records.map(r=>[r.path,0]));
  for(const targets of graph.values())for(const target of targets)inbound.set(target,inbound.get(target)+1);
  const reached=new Set(['/']),queue=['/'];
  for(let i=0;i<queue.length;i++)for(const target of graph.get(queue[i])||[])if(!reached.has(target)){reached.add(target);queue.push(target);}
  return {basis:'Deterministic template graph; not an exhaustive HTTP crawl. Navigation, listing pagination, product-brand and explicit blog mappings. Repeated links to the same target within a page are collapsed.',orphanPages:[...graph.keys()].filter(p=>!reached.has(p)),zeroInbound:[...inbound].filter(([,n])=>n===0).map(([p])=>p),brokenLinks:broken,edgeCount:[...graph.values()].reduce((n,s)=>n+s.size,0),duplicateLinkPatterns:'Shared navigation/RFQ links expected. Random six-product blog block and hidden keyword links removed; full rendered-site repetition requires a deployed crawl.'};
}
function keywordIssues(keywords,inv) {
  const urls=new Set(inv.records.map(r=>new URL(r.path,seo.SITE).href));
  if(!Array.isArray(keywords))return ['Keyword inventory must be an array'];
  return keywords.flatMap((k,i)=>['keyword','category','landingURL','intent','priority','market','notes'].every(field=>typeof k[field]==='string'&&k[field].trim())&&Object.hasOwn(k,'brand')&&urls.has(k.landingURL)?[]:[`Invalid keyword entry ${i}`]);
}
function contentAudit(inv) {
  const titleGroups=duplicates(inv.records.filter(r=>r.type==='blog'),r=>r.metadata.title);
  const descriptionGroups=duplicates(inv.records.filter(r=>r.type==='blog'),r=>r.metadata.description);
  const dupTitles=new Set(titleGroups.flatMap(g=>g.paths)),dupDescriptions=new Set(descriptionGroups.flatMap(g=>g.paths));
  return inv.blogs.map(post=>{
    const url=`/blog/${post.slug}`,summary=post.description||post.excerpt;
    const titleBrands=inv.brands.filter(b=>post.title.toLowerCase().includes(b.name.toLowerCase()));
    const mismatch=titleBrands.length>0&&titleBrands.every(b=>!summary.toLowerCase().includes(b.name.toLowerCase()))&&inv.brands.some(b=>summary.toLowerCase().includes(b.name.toLowerCase()));
    const reasons=['Shared generic body; topic-specific editorial review required'];
    if(mismatch)reasons.push('Brand in description conflicts with title');
    if(dupTitles.has(url))reasons.push('Duplicate title: consider consolidation after editorial review');
    if(dupDescriptions.has(url))reasons.push('Repeated description');
    if(summary.length<120)reasons.push('Short unique summary');
    return {url,title:post.title,priority:mismatch||dupTitles.has(url)?'high':'medium',reasons,action:'Write verified topic-specific guidance; review intent and consolidate true duplicates with redirects only after editorial approval. No automatic mass rewrite or noindex.'};
  }).sort((a,b)=>a.priority.localeCompare(b.priority)||a.url.localeCompare(b.url));
}
function buildReport(products,blogs,keywords,mappings) {
  const inv=seo.inventory(products,blogs),groups=seo.sitemapGroups(inv),urls=Object.values(groups).flat();
  Object.values(groups).forEach(urls=>seo.xmlDocument(urls));
  const links=linkAudit(inv,mappings),content=contentAudit(inv);
  const titles=duplicates(inv.records,r=>r.metadata.title),descriptions=duplicates(inv.records,r=>r.metadata.description),canonicals=duplicates(inv.records,r=>r.metadata.alternates?.canonical);
  const missingMetadata=inv.records.filter(r=>!r.metadata.title||!r.metadata.description).map(r=>r.path);
  const missingCanonical=inv.records.filter(r=>!r.metadata.alternates?.canonical).map(r=>r.path);
  const canonicalAnomalies=inv.records.filter(r=>r.metadata.alternates?.canonical!==new URL(r.path,seo.SITE).href).map(r=>r.path);
  const inventoryURLs=new Set(inv.records.map(r=>new URL(r.path,seo.SITE).href)),sitemapURLs=new Set(urls);
  const schemaRecords=inv.records.filter(r=>['product','brand','brandPagination','blog'].includes(r.type)||r.path==='/');
  const report={generatedAt:new Date().toISOString(),name:'Indexable URL Inventory',basis:'Local catalog snapshot and shared route templates. Coverage is template-derived, not all-URL HTTP validation, Google indexation or a content-quality endorsement.',catalog:{totalProducts:products.length,indexableProducts:inv.products.length,brands:inv.brands.length,blogs:inv.blogs.length},inventory:{total:inv.records.length,products:inv.products.length,brands:inv.brands.length,blog:inv.blogs.length,core:inv.records.filter(r=>r.type==='core').length,brandPagination:inv.records.filter(r=>r.type==='brandPagination').length},technical:{sitemapStatus:'PASS',robotsStatus:'Template policy configured; HTTP smoke test required before deployment',sitemapURLCount:urls.length,children:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),productChunks:Object.keys(groups).filter(k=>k.startsWith('products-')).length,canonicalCoverage:inv.records.length-missingCanonical.length,metadataCoverage:inv.records.length-missingMetadata.length,structuredDataCoverage:schemaRecords.length,structuredDataEligible:schemaRecords.length,structuredDataNotApplicable:inv.records.length-schemaRecords.length,structuredDataTypes:['Organization','WebSite','Product (no Offer)','BreadcrumbList','BlogPosting']},integrity:{duplicateTitles:titles,duplicateDescriptions:descriptions,duplicateCanonicals:canonicals,missingCanonical,missingMetadata,canonicalAnomalies,sitemapDuplicates:urls.length-sitemapURLs.size,sitemapMissingPages:[...inventoryURLs].filter(u=>!sitemapURLs.has(u)),invalidSitemapMappings:urls.filter(u=>!inventoryURLs.has(u)),keywordIssues:keywordIssues(keywords,inv)},links,content:{editorialReviewCount:content.length,highPriority:content.filter(p=>p.priority==='high').length,report:'reports/seo/content-improvement.md'},keywordCount:keywords.length,noindex:{patterns:['/admin/*','/api/*','/search','/internal/*','/tools/*','/scraper/*','filtered listing variants'],note:'Dynamic query combinations are not counted as finite pages. Missing records return notFound/noindex.'},google:{searchConsole:'NOT CONNECTED',indexedCount:'NOT AVAILABLE',clicks:'NOT AVAILABLE',impressions:'NOT AVAILABLE',rankings:'NOT AVAILABLE'}};
  const failures=[missingMetadata.length,missingCanonical.length,canonicalAnomalies.length,canonicals.length,report.integrity.sitemapDuplicates,report.integrity.sitemapMissingPages.length,report.integrity.invalidSitemapMappings.length,report.integrity.keywordIssues.length,links.brokenLinks.length,links.orphanPages.length];
  report.status=failures.some(Boolean)?'FAIL':titles.length||descriptions.length||content.length?'WARN':'PASS';
  return {report,content};
}
function csv(keywords) {
  const fields=['keyword','category','landingURL','brand','intent','priority','market','notes'];
  const cell=value=>'"'+String(value??'').replace(/^[=+\-@]/,"'$&").replaceAll('"','""')+'"';
  return fields.join(',')+'\n'+keywords.map(k=>fields.map(f=>cell(k[f])).join(',')).join('\n')+'\n';
}
function safeRead(root,relative) {
  const target=path.join(root,relative);
  let current=root;
  for(const part of relative.split('/')){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw new Error('Symbolic link input rejected');}
  return fs.readFileSync(target,'utf8');
}
function collect(root=ROOT) {
  const source=safeRead(root,'data/products.json');
  const {report,content}=buildReport(JSON.parse(source),parseBlogs(safeRead(root,'data/blog-posts.ts')),JSON.parse(safeRead(root,'data/seo-keywords.json')),JSON.parse(safeRead(root,'data/seo-blog-links.json')));
  report.catalog.sha256=crypto.createHash('sha256').update(source).digest('hex');
  report.catalog.snapshotNote='One immutable read; acquisition may advance after this snapshot.';
  const expected = {
    'app/products/[slug]/page.tsx': ['productMeta(', 'productSchema(', 'notFound()', 'SeoJsonLd', 'readProducts()'],
    'app/brands/[slug]/page.tsx': ['brandMeta(', 'breadcrumbs(', 'notFound()', 'ProductListing'],
    'app/blog/[slug]/page.tsx': ['blogMeta(', 'blogSchema(', 'notFound()', 'seo-blog-links.json'],
    'app/page.tsx': ['coreMeta(', 'homeSchema()', 'readProducts()'],
    'app/products/page.tsx': ['coreMeta(', 'ProductListing', 'notFound()'],
    'app/brands/page.tsx': ['coreMeta(', 'brandsFor('],
    'app/blog/page.tsx': ['coreMeta('],
    'app/request-quote/layout.tsx': ['coreMeta('],
    'app/sitemap.xml/route.ts': ['sitemapGroups(', 'inventory(', 'status:503'],
    'app/sitemaps/[name]/route.ts': ['xmlDocument(', 'status:503'],
    'app/robots.ts': ['policy()'],
    'app/admin/layout.tsx': ['index:false'],
    'app/search/layout.tsx': ['index:false'],
    'next.config.ts': ['X-Robots-Tag', '/api/:path*', '/admin/:path*'],
    'components/SeoJsonLd.tsx': ['safeJson(data)'],
    'components/ProductListing.tsx': ['href={pagePath(base,n)}'],
  };
  report.technical.templateWiringIssues=[];
  for(const [file,markers] of Object.entries(expected)) {
    try {const text=safeRead(root,file);for(const marker of markers)if(!text.includes(marker))report.technical.templateWiringIssues.push({file,missing:marker});}
    catch {report.technical.templateWiringIssues.push({file,missing:'Readable source file'});}
  }
  report.technical.coverageVerified=report.technical.templateWiringIssues.length===0;
  if(!report.technical.coverageVerified)report.status='FAIL';
  report.noindex.fixedPages=[];
  const walk=dir=>{if(!fs.existsSync(path.join(root,dir)))return;for(const item of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){if(item.isSymbolicLink())continue;const file=dir+'/'+item.name;if(item.isDirectory())walk(file);else if(item.name==='page.tsx'){const route='/'+file.slice(4,-9).replace(/\/$/,'');if(seo.noindex(route))report.noindex.fixedPages.push(route);}}};
  walk('app');report.noindex.fixedPageCount=report.noindex.fixedPages.length;
  return {report,content};
}
function writeReports(root=ROOT) {
  const {report,content}=collect(root);
  const keywords=JSON.parse(safeRead(root,'data/seo-keywords.json'));
  let dir=root;
  for(const segment of ['reports','seo']) {dir=path.join(dir,segment);if(fs.existsSync(dir)&&fs.lstatSync(dir).isSymbolicLink())throw new Error('Symbolic link output rejected');fs.mkdirSync(dir,{recursive:true});}
  const files={
    'status.json':JSON.stringify(report,null,2)+'\n',
    'status.md':`# SEO operations status: ${report.status}\n\n${report.basis}\n\nGenerated: ${report.generatedAt}\n\n## Catalog and inventory\n\n\`\`\`json\n${JSON.stringify({catalog:report.catalog,inventory:report.inventory,technical:report.technical},null,2)}\n\`\`\`\n\nDuplicate title groups: ${report.integrity.duplicateTitles.length}; duplicate description groups: ${report.integrity.duplicateDescriptions.length}; duplicate canonicals: ${report.integrity.duplicateCanonicals.length}.\n\nOrphans: ${report.links.orphanPages.length}; broken modeled links: ${report.links.brokenLinks.length}. See internal-links.json for measurement limits.\n\nEditorial review: ${content.length} posts, ${report.content.highPriority} high priority. See content-improvement.md. Keywords: ${report.keywordCount}.\n\nGoogle Search Console: NOT CONNECTED. Indexed count, impressions, clicks and rankings: NOT AVAILABLE.\n\nSee status.json for full integrity findings, noindex routes and coverage counts.\n`,
    'content-improvement.json':JSON.stringify(content,null,2)+'\n',
    'content-improvement.md':'# Blog content improvement queue\n\nTechnical inclusion does not certify content quality. Existing posts retained pending editorial work. No mass rewriting performed.\n\n'+content.map(c=>`- **${c.priority}** [${c.title}](${seo.SITE}${c.url}): ${c.reasons.join('; ')}. ${c.action}`).join('\n')+'\n',
    'internal-links.json':JSON.stringify(report.links,null,2)+'\n',
    'keywords.csv':csv(keywords)
  };
  for(const name of OUTPUTS){const target=path.join(dir,name);if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw new Error('Symbolic link report rejected');fs.writeFileSync(target,files[name]);}
  return report;
}
if(require.main===module){try{if(process.argv.length>2)throw new Error('No arguments supported');const r=writeReports();console.log(JSON.stringify({status:r.status,inventory:r.inventory,technical:r.technical,report:'reports/seo/status.json',google:r.google},null,2));process.exitCode=r.status==='FAIL'?1:0;}catch(error){console.error('SEO report failed safely: '+error.message);process.exitCode=1;}}
module.exports={parseBlogs,duplicates,linkAudit,keywordIssues,contentAudit,buildReport,csv,collect,writeReports,OUTPUTS};
