/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS release verifier uses the existing Node CLI helpers. */
'use strict';
// Release verification only: no network, state changes or catalog writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const c=require('../../scripts/classic-automation-complete-crawl');
const images=require('../../scripts/product-image-files');
const seo=require('../../lib/seo-core');
const reports=require('../../scripts/seo-operations-report');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'PRODUCTION-RELEASE-v1.catalog-diff.json'),'utf8'));
const raw=fs.readFileSync(path.join(root,'data/products.json'));
const sha256=crypto.createHash('sha256').update(raw).digest('hex');
if(sha256!==manifest.publicationSha256)throw Error('Frozen publication catalog SHA mismatch');
const products=c.validateCatalog(JSON.parse(raw));
const previous=JSON.parse(execFileSync('git',['show','6f0772505967e1a1300b4dfe613e6b7331dd232b:data/products.json'],{cwd:root,encoding:'utf8',maxBuffer:30000000}));
const map=new Map(products.map(p=>[p.slug,p]));
const allowed=new Set(['siemens-s7-400','siemens-et200']);
let modified=0;
for(const old of previous){const next=map.get(old.slug);if(!next)throw Error('Production product removed');const changed=[...new Set([...Object.keys(old),...Object.keys(next)])].filter(k=>JSON.stringify(old[k])!==JSON.stringify(next[k]));if(changed.length){if(!allowed.has(old.slug)||changed.length!==1||changed[0]!=='image'||next.image!=='/product-images/default.jpg')throw Error('Unexpected existing product change');modified++;}}
if(modified!==2||products.length!==manifest.releaseCount)throw Error('Publication counts changed');
const checked=new Map();
for(const p of products){if(Object.hasOwn(p,'acquisition'))throw Error('Operational acquisition metadata leaked');if(p.sourceUrl){const u=new URL(p.sourceUrl);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Unsafe source URL');}if(!checked.has(p.image))checked.set(p.image,images.inspectImage(p.image,root).kind);if(checked.get(p.image)!=='valid')throw Error('Broken publication image: '+p.slug);}
const blogs=reports.parseBlogs(fs.readFileSync(path.join(root,'data/blog-posts.ts'),'utf8'));
const inventory=seo.inventory(products,blogs),groups=seo.sitemapGroups(inventory);
for(const urls of Object.values(groups))seo.xmlDocument(urls);
const output={publicationSha256:sha256,products:products.length,previousProducts:previous.length,added:products.length-previous.length,removed:0,modifiedExisting:modified,classicAutomation:products.filter(p=>p.source==='ClassicAutomation').length,duplicateIdentities:0,duplicateSlugs:0,brokenImages:0,uniqueImageFiles:checked.size,seoInventory:inventory.records.length,sitemapURLs:Object.values(groups).flat().length,sitemapChildren:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),canonicalHost:seo.SITE};
console.log(JSON.stringify(output,null,2));
