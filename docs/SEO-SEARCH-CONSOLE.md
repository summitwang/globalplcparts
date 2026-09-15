# Google Search Console onboarding

Readiness documentation is prepared; **Search Console is not connected to this collector**. No Google indexed count, impressions, clicks or ranking data is available locally. A verification key does not prove verified ownership or an active data connection.

1. A human site owner should create a **Domain property** for `globalplcparts.com` in [Google Search Console](https://search.google.com/search-console). This covers protocols and subdomains. Verify with the DNS TXT record supplied by Google; review the exact DNS change separately before applying it.
2. Alternative: create a URL-prefix property for `https://globalplcparts.com/` and choose an eligible HTML tag/file, Analytics, Tag Manager or DNS verification method. The existing root metadata has a `metadata.verification.google` key. Its value is neither documented nor replaced by this implementation. A URL-prefix HTML tag cannot substitute for Domain-property DNS verification.
3. After a separately approved deployment and public checks, submit `https://globalplcparts.com/sitemap.xml` in Sitemaps. Check child discovery, last fetch, parsing and URL totals. Do not submit the local report or confuse discovered URLs with indexed URLs.
4. Inspect representative homepage, product, brand, paginated catalog and blog URLs using URL Inspection. Compare declared and Google-selected canonical, crawled page, response and last crawl. Request indexing selectively when justified; no automatic bulk submissions are built here.

Monitor weekly initially: Performance clicks/impressions/CTR/average position by query, country, device and landing page; Page indexing exclusions; sitemap failures; Crawl stats; Core Web Vitals and HTTPS. Review Manual actions and Security issues explicitly. Search Console figures can lag and differ from local inventory; segment by product/brand/blog and distinguish canonical consolidation, discovered-not-indexed and crawled-not-indexed.

Troubleshooting order: check actual public status and redirect chain; robots and noindex; canonical and duplicate content; sitemap reachability; rendered links and content; server errors/latency; editorial value. Soft 404 reports may also indicate thin content even when HTTP status is 200. Structured Product data without offers is intentional when price/stock are unknown; never fabricate fields to silence rich-result warnings. Confirm the deployed catalog version: this Windows crawler does not update an immutable Vercel deployment automatically.

Future reporting integration needs separately authorized read-only Search Console access and explicit property selection. Keep credentials in platform secret storage, outside repository/report files. Do not use private customer data, scrape Google SERPs, or claim rankings from local keyword targets.

References: [verification methods](https://support.google.com/webmasters/answer/9008080), [sitemap management](https://support.google.com/webmasters/answer/7451001), [Page indexing report](https://support.google.com/webmasters/answer/7440203).
