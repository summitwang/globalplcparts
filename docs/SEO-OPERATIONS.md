# SEO operating system v1.0

## Exact indexing policy

Production canonical origin: `https://globalplcparts.com`. No trailing slash except `/`.

| Route | Policy |
| --- | --- |
| `/`, `/products`, `/brands`, `/blog`, `/request-quote` | Indexable public landing pages; self canonical. Public RFQ form remains discoverable. |
| `/products/[slug]` | Valid, nonempty brand/model/category/description records with unique identities and safe slugs are candidates. Model-specific sourcing copy; no asserted inventory or terms. |
| `/brands/[slug]` | Existing catalog brands only; visible sourcing context and exact product count. |
| `/blog/[slug]` | Existing valid posts retained as candidates; technical inclusion is not editorial approval. Review the content-improvement queue before expecting search performance. |
| `/products?page=N`, `/brands/[slug]?page=N` | Valid pages are indexable, self canonical, server-rendered links; 48 products per page. Included in core/brand sitemaps. `page=1` redirects to base; invalid/out-of-range pages return 404. |
| Known product/brand/blog slug with alternate casing | Permanent redirect to lowercase record slug. No invented legacy aliases. |
| Detail/RFQ/blog tracking or model query strings | Canonical strips query; no query variants in sitemap. |
| Legacy product search/brand filters | Redirect to `/search?q=...`; search is noindex. Unknown listing filters are noindex, canonical to clean listing page. |
| `/admin` and descendants | Metadata and X-Robots-Tag noindex; robots disallow. Includes RFQ administration, image tools and scraper interface. |
| `/api/*`, `/internal/*`, `/tools/*`, `/scraper/*` | X-Robots-Tag noindex; robots disallow. Quote processing API is internal; commercial RFQ landing is public. |
| `/search` and queries | Noindex; excluded from sitemap. Crawlable so crawlers can see directive. |
| Missing products/brands/blogs and invalid pagination | `notFound()` with noindex; blocking metadata avoids sending a streamed 200 before record resolution. |

Robots is crawl guidance, not security or authentication. A disallowed URL may still be known to Google; a blocked crawler cannot read noindex. For previously indexed private URLs use Search Console removal and maintain authentication; consider a reviewed crawl-policy change only when safe. No authentication changes are part of this work.

## Sitemap and catalog growth

`/sitemap.xml` is a sitemap index. Children: `/sitemaps/core.xml`, `brands.xml`, `blog.xml`, and `products-N.xml` (5,000 products each). Product chunks are sorted by slug, XML escaped and constrained to 50,000 URLs / 50 MiB per document. All URLs use the production HTTPS origin. No lastmod is emitted: the catalog has no verified per-record modification timestamp. Blog publication date is not repurposed as a modification date.

Server catalog pages and sitemap handlers read a request-scoped local JSON snapshot. New local crawler records appear without restarting/building. Malformed/duplicate catalog input fails closed: sitemap returns 503 with Retry-After rather than publishing a partial successful sitemap. Reading never acquires the crawler lock or changes its catalog/state. Pagination membership may shift as sorted inventory grows; every snapshot remains deterministic. Separate HTTP requests can see different valid acquisition snapshots.

**Deployment boundary:** a Vercel deployment has an immutable bundled catalog snapshot. It cannot see this Windows workspace's later crawler writes. Automatic local growth is supported; production growth requires a separately approved publishing/data delivery process. This task neither connects a new production data service nor deploys the site. The catalog JSON is included in output tracing for future deployments. An all-bot blocking metadata configuration trades streaming latency for reliable missing-record statuses; revisit with measured production latency if necessary.

## Metadata, structured data and links

`lib/seo-core.js` provides shared metadata/validation/sitemap rules; its declaration file gives Next.js typed interfaces. Product, brand, blog and core routes have their own canonical, title, description, Open Graph and Twitter metadata. Product schema only describes brand/model/category and sourcing context. No Offer, price, rating, review, stock, inferred SKU or warranty is emitted. Product uses the actual model as MPN. No rich-result eligibility is promised for a Product without offers/reviews.

Home has Organization/WebSite; product and brand have BreadcrumbList; blogs have BlogPosting and breadcrumbs. Safe JSON serialization escapes script-breaking characters. Publication date uses existing data; no fabricated modification date. ProductImage retains its established brand/model alt and fallback implementation.

Brand grids and global product grids are paginated with links. Products link to their brand, same-brand related products and RFQ. Blog brand links require explicit entries in `data/seo-blog-links.json`; the old unrelated six-product block is removed. A visible metadata description is used on product detail instead of bulk legacy claims. Hidden brand keywords are removed entirely.

## Local reports and measurement limits

Run `node scripts/seo-operations-report.js`. It reads only catalog, blog source, keyword inventory, explicit blog mappings and route filenames; writes only the six named outputs under `reports/seo/`. It does not load application/env configuration, connect to external services, invoke customer operations, change Git, or write catalog/checkpoints. Input catalogs are read once and fingerprinted; reports are snapshot evidence, not a transaction with the continuing crawler.

Outputs: status JSON/Markdown, prioritized content-improvement JSON/Markdown, internal-links JSON and keyword CSV. Initial `audit.md/json` preserve the previously completed source inspection before application edits. Generated files are not committed. Reports use **Indexable URL Inventory**, never actual Google indexed pages. Metadata/schema coverage is derived from shared templates; link reachability is a modeled graph, not an exhaustive rendered-site crawl. Integration smoke tests validate representative actual responses. Duplicate title/description groups and all thin/shared-body blog concerns remain visible as WARN; structural failures return exit 1.

Search Console, clicks, impressions, index counts and rankings remain NOT CONNECTED / NOT AVAILABLE. See [Search Console onboarding](SEO-SEARCH-CONSOLE.md). Keyword configuration is a small reviewed starting inventory: generic sourcing plus one brand and representative actual model per brand. No ranking collection or SERP scraping. CSV cells protect spreadsheet formula prefixes.

Existing health and AUTO-002 **read-only source checks** now reference the replacement sitemap handler. AUTO-002 recognizes only the eight exact generated SEO report paths as runtime exceptions; arbitrary files under reports/seo remain disallowed. Task definitions and baselines remain unchanged. Its legacy source markers may show advisory differences when logic moves into shared helpers; the dedicated SEO report is the authoritative template audit. No AUTO task is manually executed by this workflow.

## Proposed GPLP-SEO-DAILY — design only

- Daily 05:30 Asia/Singapore; report generation is local and does not need frequent polling.
- Account `DESKTOP-EVEM1EN\User`, S4U/password-free where supported, Limited, IgnoreNew.
- Executable `C:\Program Files\nodejs\node.exe`.
- Arguments `"C:\Projects\globalplcparts\scripts\seo-operations-report.js"`.
- Working directory `C:\Projects\globalplcparts`; maximum 5 minutes; start missed run when available; normal AC conditions; no wake; no retries.
- Reports only. No crawler state changes, publishing, URL submission, external requests, deployment, commit or push.
- **Not registered.** Activation requires separate explicit authorization after reviewing the implementation and report.

## Validation

`node --test scripts/seo-operations.test.js`; relevant ESLint; `npm.cmd run build`; `npm.cmd run health-check`; `node scripts/seo-operations-report.js`. Local production HTTP smoke test: start Next on loopback and run `node scripts/seo-http-test.js http://127.0.0.1:PORT`. It retrieves public HTML/XML only (no JavaScript execution or customer/API operations). No crawler/image suites are needed unless those implementations change.

## Local validation evidence (2026-09-15)

56 dedicated cases passed in the consolidated run; the added Next.js homepage-canonical regression and its related cases then passed after the HTTP finding was fixed (57 distinct cases total). Production build and TypeScript passed. The rebuilt local production server passed 29 HTTP checks, including true 404s, redirects, canonicals, robots and all sitemap children. Lint passed with one pre-existing ProductImage native-img warning; new SEO tooling lint is clean. Health: 15 PASS, 4 WARN, 0 FAIL. Existing crawler/image implementations and all three task XML hashes were unchanged.

The SEO report retains WARN for editorial work rather than suppressing duplicate/thin-content findings. No Search Console connection, deployment, push or SEO task registration occurred.
