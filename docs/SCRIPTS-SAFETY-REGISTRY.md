# GlobalPLCParts Scripts Safety Registry

## Purpose and scope

This registry is a static, repository-evidence-based inventory of every JavaScript file currently under `scripts/`. It is an operational safety reference, not authorization to run a script.

The inspection did not execute any listed automation script. It did not access environment files, Supabase, Resend, customer data, or external websites.

Operational status meanings:

- **CURRENT CANDIDATE**: the file is wired to a current `package.json` command or was explicitly introduced as the repository health check. This means only that the repository exposes it as an entry point; it does not mean the script is approved for production use.
- **LEGACY CANDIDATE**: repository naming or a newer related implementation suggests supersession, and the file is not the preferred package entry point. This is an inference.
- **BROKEN / MISSING DEPENDENCY**: the referenced entry point or required local input is absent or structurally unusable.
- **UNKNOWN**: repository evidence does not establish current operational use.

Risk classifications:

- **READ-ONLY**: reads repository state and prints to stdout without writing reports or business data.
- **LOW-RISK WRITE**: writes a derived local audit/debug artifact but does not intentionally alter the catalog, blog, or product image library.
- **HIGH-RISK DATA MUTATION**: can change catalog, blog, or product-image data without external acquisition.
- **HIGH-RISK NETWORK + MUTATION**: accesses external sites and writes files or data.
- **UNKNOWN / NEEDS REVIEW**: behavior or intended invocation is not sufficiently established.

### Mutation flags

The tables use these compact flags:

- **P**: may modify `data/products.json`
- **B**: may modify blog data
- **I**: may modify files under `public/product-images/`
- **C**: may modify cache, crawler state, import log, or generated report files under `data/`
- `—`: no matching mutation was found during static inspection

Unless a row says otherwise, static inspection found **no rollback support and no automatic backup behavior**. A script that can rewrite the catalog commonly rewrites the complete JSON file in place.

## Registry

### Read-only and reporting scripts

| Script | Purpose | npm command | Inputs | Outputs / possible modifications | Network / external services | Flags | Browser | Dry-run | Dependencies / family | Risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `health-check.js` | Deterministic repository, catalog, image, blog, route, environment-name, and script-risk validation | `npm run health-check` | Git status; source files; `data/products.json`; `data/blog-posts.ts`; `public/` metadata | Stdout and exit code only | No | — | No | Not needed; intrinsically read-only | Node built-ins and Git CLI; independent of other repository scripts | **READ-ONLY** | **CURRENT CANDIDATE** |
| `check-local-images.js` | Checks whether catalog image paths exist below `public/` | No effective npm command; an earlier duplicate `check-images` key names it but is overwritten | `data/products.json`, `public/` | Stdout only | No | — | No | Not needed; intrinsically read-only | Node built-ins; earlier image-audit candidate | **READ-ONLY** | **LEGACY CANDIDATE** |
| `check-product-images.js` | Classifies real-local, fallback, remote, missing, and bad product image paths | Effective `npm run check-images` | `data/products.json`, `public/` | Writes `data/reports/image-check-report.json`; stdout | No | C | No | No | Node built-ins; overlaps `check-local-images.js` and `image-library-audit-v6.js` | **LOW-RISK WRITE** | **CURRENT CANDIDATE** |
| `image-library-audit-v6.js` | Counts catalog products and available real images by brand | `npm run audit-images-v6` | `data/products.json`, `public/product-images/real/` | Writes `data/image-library-needed.json`; stdout | No | C | No | No | Node built-ins; image audit family | **LOW-RISK WRITE** | **CURRENT CANDIDATE** |

### Catalog generation, cleanup, and local mapping

| Script | Purpose | npm command | Inputs | Outputs / possible modifications | Network / external services | Flags | Browser | Dry-run | Dependencies / family | Risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `generate-products-1000.js` | Generates additional products from embedded brand/model templates | None | Existing `data/products.json`; embedded generation rules | Rewrites `data/products.json` | No | P | No | No | Standalone generator | **HIGH-RISK DATA MUTATION** | **UNKNOWN** |
| `real-industrial-models.js` | Adds embedded industrial model lists to the catalog | None | Existing catalog; embedded brand/model definitions | Rewrites `data/products.json` | No | P | No | No | Standalone generator/expansion precursor | **HIGH-RISK DATA MUTATION** | **UNKNOWN** |
| `enhance-products-seo.js` | Replaces/enhances product descriptions using templates | None | `data/products.json` | Rewrites `data/products.json` | No | P | No | No | Content generation utility | **HIGH-RISK DATA MUTATION** | **UNKNOWN** |
| `generate-model-blogs.js` | Generates model-oriented blog records from catalog entries | None | `data/products.json`, existing `data/blog-posts.ts` | Rewrites `data/blog-posts.ts` | No | B | No | No | Blog generator | **HIGH-RISK DATA MUTATION** | **UNKNOWN** |
| `generate-brand-images.js` | Generates brand fallback SVG files | None | Embedded brand definitions | Writes SVG files in `public/product-images/` | No | I | No | No | Brand-image generator | **HIGH-RISK DATA MUTATION** | **UNKNOWN** |
| `import-products.js` | Parses root `products.csv`, merges records, and writes the active catalog | None | `products.csv`, `data/products.json` | Rewrites `data/products.json` | No | P | No | No | Requires root CSV input; separate from admin XLSX importer | **HIGH-RISK DATA MUTATION** | **UNKNOWN** |
| `clean-product-models-v141.js` | Normalizes model fields and removes/merges suspect records | `npm run clean-products-v141` | `data/products.json`; CLI `--dry-run` | Rewrites `data/products.json` unless dry-run | No | P | No | **Yes: `--dry-run`** | Cleanup family; v14.1 naming | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |
| `clean-v15-dirty-products.js` | Removes records identified as dirty Classic Automation-derived entries | `npm run clean-v15-dirty` | `data/products.json`; CLI `--dry-run` | Rewrites `data/products.json` unless dry-run | No | P | No | **Yes: `--dry-run`** | Cleanup companion to v15 expansion | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |
| `fix-product-images-v2.js` | Reassigns catalog image paths through embedded matching rules | `npm run fix-images` | `data/products.json`; embedded mappings | Rewrites `data/products.json` | No | P | No | No | Early image-fix family | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |
| `update-product-images-svg.js` | Replaces catalog image values with brand SVG paths | None | `data/products.json` | Rewrites `data/products.json` | No | P | No | No | Fallback-image migration utility | **HIGH-RISK DATA MUTATION** | **UNKNOWN** |
| `image-mapper-v2.js` | Assigns images from embedded brand pools | `npm run map-images` | `data/products.json`; embedded paths | Rewrites `data/products.json` | No | P | No | No | Image-mapper v2 family | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |
| `image-mapper-v3.js` | Assigns model-family images after checking local files | `npm run map-images-v3` | `data/products.json`, `public/` | Rewrites `data/products.json` | No | P | No | No | Supersedes/extends v2 by naming; v4 also exists | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |
| `image-mapper-v4.js` | Maps products to files discovered in per-brand real-image directories | `npm run map-images-v4` | `data/products.json`, `public/product-images/real/` | Rewrites `data/products.json` | No | P | No | No | Newest package-wired image-mapper by version naming | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |
| `backfill-classic-images-v134.js` | Matches existing local Classic Automation-derived files to catalog models | `npm run backfill-classic-images` | `data/products.json`, selected brand directory under `public/product-images/real/`, optional brand CLI argument | Rewrites `data/products.json` | No | P | No | No | Classic image backfill family; depends on previously downloaded images | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |
| `product-expansion-v14.js` | Creates catalog products from filenames already present in a brand image folder | `npm run expand-products-v14` | `data/products.json`, `public/product-images/real/<brand>/`, optional brand CLI argument | Rewrites `data/products.json` | No | P | No | No | Earliest present product-expansion version | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |
| `product-image-engine-v22.js` | Repairs catalog image paths using existing local brand images and fallbacks | `npm run fix-images-v22` | `data/products.json`, `public/product-images/real/`, optional limit | Rewrites `data/products.json` | No | P | No | No | Newest present product-image-engine; unlike v19-v21.5, local-only | **HIGH-RISK DATA MUTATION** | **CURRENT CANDIDATE** |

### Networked import, scraping, expansion, and image acquisition

| Script | Purpose | npm command | Inputs | Outputs / possible modifications | Network / external sites | Flags | Browser | Dry-run | Dependencies / family | Risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `debug-alibaba.js` | Opens an Alibaba product-list page and captures debug artifacts | None | Hard-coded Alibaba storefront URL | Writes root `alibaba-debug.png` and `alibaba-debug.html` | Alibaba | — | **Yes, headed Playwright** | No | Debug companion to Alibaba scrapers | **HIGH-RISK NETWORK + MUTATION** | **LEGACY CANDIDATE** |
| `scrape-products.js` | Crawls Alibaba product-group/list pages into a staging JSON collection | None | CLI target count/URL; default Alibaba URL | Writes `data/products-scraped.json` | Alibaba | C | **Yes, Playwright** | No | Earlier staging scraper; does not write active catalog | **HIGH-RISK NETWORK + MUTATION** | **LEGACY CANDIDATE** |
| `scrape-real-models-v21.js` | Crawls Alibaba product listings and merges normalized products | `npm run scrape-real` | CLI URL/count; default Alibaba storefront; existing catalog | Rewrites `data/products.json` | Alibaba | P | **Yes, Playwright** | No | Alibaba model-scraping family; related to `scrape-products.js` | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `update-real-images.js` | Visits each product `sourceUrl` and extracts/reassigns image URLs | `npm run update-images` | `data/products.json`; arbitrary source URLs stored in product records | Rewrites `data/products.json` | Product-provided external URLs | P | **Yes, headed Playwright** | No | Image update family | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `image-engine-v8-1-ai.js` | Builds search queries, scrapes Bing image markup, and assigns discovered images | None | Product objects supplied to its `run` function; Bing results | Writes `data/products.json` through a relative path | Bing Images | P | No; Axios/Cheerio | No | Early image-engine family; not package-wired | **HIGH-RISK NETWORK + MUTATION** | **LEGACY CANDIDATE** |
| `image-engine-v11-real.js` | Chooses remote product/source-page images or brand-library fallbacks | None | `data/products.json`; product `image`/`sourcePage`; local library | Rewrites `data/products.json`; creates `public/product-images/real/` directory if absent | Arbitrary source pages stored in catalog | P/I | No; Axios | No | Later early image-engine; predecessor to numbered product-image engines | **HIGH-RISK NETWORK + MUTATION** | **LEGACY CANDIDATE** |
| `import-official-images-v51.js` | Imports remote official-image mappings from a workbook | `npm run import-official-images -- <workbook>` | User-selected XLSX; `data/products.json`; remote URLs from workbook | Downloads to `public/product-images/models/`; rewrites catalog | Arbitrary workbook-supplied URLs | P/I | No; Axios | No | Official-image import family; requires external workbook | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `import-brand-image-pack-v6.js` | Downloads a workbook-defined image pack into brand folders | `npm run import-brand-pack -- <workbook>` | User-selected XLSX; remote URLs from workbook | Writes files under `public/product-images/real/<brand>/` | Arbitrary workbook-supplied URLs | I | No; Axios | No | Brand-pack import family; does not rewrite active catalog in inspected code | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `scrape-model-images-v5.js` | Searches Bing Images for catalog models and downloads selected results | `npm run scrape-model-images` | `data/products.json`; optional limit | Writes `public/product-images/models/`; rewrites catalog | Bing Images and discovered image hosts | P/I | **Yes, Playwright** | No | Model image scraper v5 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `official-image-scraper-v62.js` | Searches for manufacturer-domain images and downloads matches | `npm run scrape-official-images` | Catalog; limit/brand CLI arguments; embedded manufacturer domain allowlists | Writes `public/product-images/models/`; rewrites catalog | Bing Images; Rockwell and configured manufacturer/vendor domains | P/I | **Yes, Playwright** | No | Official-image scraper v6.2 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `scrape-rockwell-v7.js` | Searches Rockwell product pages and downloads matching images | `npm run scrape-rockwell` | Catalog; optional limit | Writes `public/product-images/models/`; rewrites catalog | Rockwell Automation and its image hosts | P/I | **Yes, Playwright** | No | Vendor-specific scraper v7 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `image-scraper-v7-full.js` | Searches configured official domains and downloads product images | `npm run scrape-images-v7-full` | Catalog; embedded brand/domain mappings | Writes `public/product-images/real/`; rewrites catalog | Rockwell and configured official/vendor domains; browser search pages | P/I | **Yes, Playwright** | No | Image-scraper v7 full branch | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `image-scraper-v7-1-direct.js` | Attempts direct manufacturer product URLs before browser extraction | `npm run scrape-images-v7-1` | Catalog; embedded direct URL templates | Writes `public/product-images/real/`; rewrites catalog | Rockwell, Baker Hughes/Bently Nevada, and configured direct hosts | P/I | **Yes, Playwright** | No | Image-scraper v7.1 branch; relationship to “full” is not operationally documented | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `scrape-brand-gallery-v111.js` | Crawls a caller-supplied gallery URL and downloads brand images | `npm run scrape-brand-gallery -- <brand> <url> [limit]` | Required CLI brand and start URL | Writes `public/product-images/real/<brand>/` | Arbitrary caller-supplied website | I | **Yes, Playwright** | No | Brand gallery scraper v11.1 naming | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `scrape-classic-automation-images-v12.js` | Crawls Classic Automation brand/category pages and downloads images | `npm run scrape-classic-images` | CLI brand/limit/page count; Classic Automation pages | Writes `public/product-images/real/<brand>/` | Classic Automation and discovered media URLs | I | **Yes, Playwright** | No | Classic Automation image scraper v12 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `scrape-classic-automation-images-v13.js` | Crawls Classic Automation detail/category pages, downloads images, and updates matching products | `npm run scrape-classic-detail-images` | Catalog; CLI brand/limit/page count/category URL | Writes `public/product-images/real/<brand>/`; rewrites catalog | Classic Automation and discovered media URLs | P/I | **Yes, Playwright** | No | Successor/variant of v12 by naming | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `test-product-image-v18.js` | Tests extraction from one supplied product-detail URL and saves a sample | `npm run test-image-v18 -- <url> [filename]` | Required CLI product URL; optional output filename | Writes `public/product-images/test/` | Caller-supplied URL, Classic Automation-oriented extraction, discovered image hosts | I | **Yes, Playwright** | No | Test harness for v18 extraction logic | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `product-expansion-v15.js` | Crawls one Classic Automation brand/category and adds products/images | `npm run expand-products-v15 -- <brand> <limit> <pages> <url>` | Catalog; CLI brand/limits/category URL | Writes brand images; rewrites catalog | Classic Automation and discovered media hosts | P/I | **Yes, headed Playwright** | No | Product-expansion v15; followed by v16/v17-clean/v18 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `product-expansion-v16.js` | Crawls embedded Classic Automation brand rules and expands catalog | `npm run expand-products-v16` | Catalog; embedded 17-brand rule set; CLI limits | Writes brand images; rewrites catalog | Classic Automation and discovered media hosts | P/I | **Yes, headed Playwright** | No | Product-expansion v16 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `product-expansion-v17-clean.js` | Expanded/cleaned multi-brand Classic Automation crawler and merger | `npm run expand-products-v17-clean` | Catalog; embedded brand rules; CLI limits | Writes brand images; rewrites catalog | Classic Automation and discovered media hosts | P/I | **Yes, headed Playwright** | No | Present v17 implementation; package also references missing `product-expansion-v17.js` | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `product-expansion-v18.js` | Resumable multi-brand crawler/expander with crawl state | `npm run expand-products-v18` | Catalog; embedded brand rules; CLI limits; `data/classic-crawl-state.json` | Writes brand images, crawl state, and catalog | Classic Automation and discovered media hosts | P/I/C | **Yes, headed Playwright** | No | Newest present product-expansion version | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `product-image-engine-v19.js` | Searches Classic Automation and other pages for images and updates catalog | `npm run fix-images-v19` | Catalog; optional limit; local image library | Writes brand images; rewrites catalog | Classic Automation, browser search results, discovered image hosts | P/I | **Yes, Playwright** | No | Product-image-engine v19 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `product-image-engine-v20.js` | Multi-source image search with persistent cache and progress state | `npm run fix-images-v20` | Catalog; optional limit; local images; v20 cache/state | Writes brand images, catalog, `image-cache-v20.json`, and `image-state-v20.json` | Classic Automation and discovered/search result hosts | P/I/C | **Yes, headed Playwright** | No | Product-image-engine v20; adds cache/state | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `product-image-engine-v21.js` | Multi-vendor image search with scoring, cache, and state | `npm run fix-images-v21` | Catalog; optional limit; local images; v21 cache/state | Writes brand images, catalog, `image-cache-v21.json`, and `image-state-v21.json` | Classic Automation, Radwell, MRO Electric, PLC Center, DO Supply, and discovered media hosts | P/I/C | **Yes, Playwright** | No | Product-image-engine v21 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |
| `product-image-engine-v21-5.js` | Extended v21 multi-vendor image search/scoring workflow | `npm run fix-images-v21-5` | Same primary inputs as v21 | Writes brand images, catalog, and the same v21 cache/state files | Classic Automation, Radwell, MRO Electric, PLC Center, DO Supply, and discovered media hosts | P/I/C | **Yes, Playwright** | No | v21.5 variant shares cache/state filenames with v21 | **HIGH-RISK NETWORK + MUTATION** | **CURRENT CANDIDATE** |

## A. Safe scripts Codex may potentially run automatically in the future

Only one existing script is a clear automatic-run candidate now:

- `health-check.js` — **READ-ONLY** and explicitly designed to avoid importing or executing repository automation, reading environment files, or accessing external services.

`check-local-images.js` is statically read-only, but it is a legacy candidate and is superseded in coverage by the health check. It should not become a second canonical command without a reason.

The following are not currently automatic-run candidates because they write reports:

- `check-product-images.js`
- `image-library-audit-v6.js`

They could become safe after adding an explicit stdout-only mode and making that mode the default.

## B. Scripts that must always require explicit user approval

Every script classified as either of the following requires explicit approval before execution:

- **HIGH-RISK DATA MUTATION**
- **HIGH-RISK NETWORK + MUTATION**

This includes every import, generation, cleanup, mapping, backfill, expansion, scraping, acquisition, image-engine, and catalog-rewrite script. Approval should name the exact command, arguments, expected inputs, intended output paths, and rollback plan. Approval to run one version does not authorize related versions.

## C. Scripts that should never run until further review

- `debug-alibaba.js`: headed browser plus root debug artifact overwrites; no package entry or cleanup policy.
- `image-engine-v8-1-ai.js`: network scraping and catalog write behavior without a normal package entry or clear invocation contract.
- `image-engine-v11-real.js`: arbitrary catalog-provided source URLs and catalog mutation; no package entry.
- `generate-products-1000.js`: bulk synthetic catalog generation without validation or rollback.
- `real-industrial-models.js`: bulk embedded catalog expansion without provenance or rollback.
- `generate-model-blogs.js`: bulk blog overwrite without editorial review state.
- `enhance-products-seo.js`: bulk description rewrite without factual approval workflow.
- `update-product-images-svg.js`: broad catalog image replacement without preview.
- `import-products.js`: direct full-catalog rewrite from an undocumented root CSV format.
- All scraper/engine versions until source approval, licensing/provenance rules, download controls, and rollback safeguards are established.

## D. Versioned script families

### Product expansion

Present sequence:

- `product-expansion-v14.js`: local-image-derived catalog expansion.
- `product-expansion-v15.js`: one-brand network crawler.
- `product-expansion-v16.js`: embedded multi-brand network crawler.
- `product-expansion-v17-clean.js`: expanded/cleaned network crawler.
- `product-expansion-v18.js`: adds persistent crawl state.

`package.json` also names `product-expansion-v17.js`, which is absent. Version order suggests evolution, but the repository does not declare a canonical approved version.

### Product image engine

- `product-image-engine-v19.js`: network discovery plus image/catalog writes.
- `product-image-engine-v20.js`: adds v20 cache and progress state.
- `product-image-engine-v21.js`: adds a defined multi-vendor source set and v21 cache/state.
- `product-image-engine-v21-5.js`: extended v21 variant sharing the same cache/state files.
- `product-image-engine-v22.js`: local-only repair using existing images and fallbacks.

V22 has the lowest external-network risk, but still rewrites the active catalog and has no dry-run or rollback.

### Image mapper

- `image-mapper-v2.js`: embedded brand pools.
- `image-mapper-v3.js`: model-family rules plus local existence checks.
- `image-mapper-v4.js`: scans brand directories and assigns local files.

All three remain package-wired; the repository does not identify one canonical mapper.

### General image engines and updates

- `image-engine-v8-1-ai.js`
- `image-engine-v11-real.js`
- `fix-product-images-v2.js`
- `update-real-images.js`
- `update-product-images-svg.js`
- `backfill-classic-images-v134.js`

These overlap with later mappers and product-image engines. Their coexistence increases the risk of applying incompatible assumptions sequentially.

### Scraping families

- Alibaba: `debug-alibaba.js`, `scrape-products.js`, `scrape-real-models-v21.js`
- Official/model images: `scrape-model-images-v5.js`, `official-image-scraper-v62.js`, `scrape-rockwell-v7.js`
- General image scrapers: `image-scraper-v7-full.js`, `image-scraper-v7-1-direct.js`
- Classic Automation: `scrape-classic-automation-images-v12.js`, `scrape-classic-automation-images-v13.js`, product-expansion v15-v18, product-image-engine v19-v21.5
- Caller-selected gallery: `scrape-brand-gallery-v111.js`
- Extraction test: `test-product-image-v18.js`

No repository document defines source authorization, canonical order, expected terms-of-use review, or image licensing/provenance requirements.

## E. Broken or suspicious `package.json` commands

1. `expand-products-v17` points to `scripts/product-expansion-v17.js`, but that file does not exist. Classification: **BROKEN / MISSING DEPENDENCY**.
2. `check-images` appears twice in the JSON source. Standard JSON parsing retains only the later value, so the effective command is `node scripts/check-product-images.js`; the earlier `node scripts/check-local-images.js` value is silently shadowed.
3. Multiple versions of `map-images`, `expand-products`, and `fix-images` remain simultaneously exposed without canonical-status documentation.
4. Several dangerous commands have large default limits and no required confirmation flag.
5. `test-image-v18` writes to the tracked product-image tree despite being named as a test.
6. No package command provides a generic dry-run wrapper, backup, diff preview, or rollback.

## F. Recommended canonical script candidates

These are recommendations for review only; no script is renamed, deleted, or approved by this registry.

- Repository health: `health-check.js` — canonical read-only health command.
- Image integrity: move the useful checks from `check-product-images.js` into an stdout-only mode or the health checker; avoid report writes by default.
- Image-library capacity: add stdout-only behavior to `image-library-audit-v6.js` before considering it canonical.
- Local image repair: `product-image-engine-v22.js` is the least network-exposed current candidate, but it needs dry-run, backup, diff, and rollback support before any approved execution.
- Product cleanup: retain the explicit dry-run behavior of `clean-product-models-v141.js` and `clean-v15-dirty-products.js`, but require diff output and backups before considering either canonical.
- Network acquisition: no canonical scraper or network image engine is recommended yet.
- Product expansion: no canonical expansion script is recommended yet.
- Image mapping: v4 is the newest mapper by filename, but evidence is insufficient to designate it canonical.

## G. Recommended future safeguards

Every mutating script should adopt the following contract before routine use:

1. **Dry-run by default** — mutation should require a separate explicit apply flag.
2. **Validated inputs** — validate argument types, URLs, file paths, workbook schema, limits, and expected source hostnames.
3. **Resolved target display** — show exact input and output files before proceeding.
4. **Backup** — create a timestamped, checksummed backup outside the overwrite target.
5. **Diff preview** — report additions, removals, field changes, duplicate impacts, image changes, and sample records.
6. **Approval token** — require a deliberate execution flag after preview; production-related execution still requires user approval.
7. **Atomic write** — write to a temporary file, validate it, then replace the target atomically.
8. **Rollback** — emit and test a clear restore command or reversible change manifest.
9. **Structured logging** — include script version, arguments, timestamps, counts, failures, source URLs, and output checksums without secrets.
10. **Provenance** — preserve source site, source URL, retrieval time, selection method, and licensing/approval status for imported data and images.
11. **Rate and scope limits** — require explicit bounded limits; prevent accidental full-catalog processing.
12. **Network allowlist** — reject unexpected redirects and caller-supplied hosts unless separately approved.
13. **Download safety** — validate MIME signatures, byte limits, dimensions, file extensions, and safe filenames.
14. **Concurrency control** — prevent two processes from rewriting the catalog or shared cache/state concurrently.
15. **Post-write validation** — run the read-only health check and fail before publication when catalog integrity is broken.
16. **Human gates** — keep external acquisition, bulk publication, customer data, pricing, availability, and communications behind the approval boundaries in `AGENTS.md`.

## Operational rule

The existence of an npm command, a “CURRENT CANDIDATE” label, a successful dry-run, or a clean health check does not authorize execution. Any script that writes catalog, blog, image, cache/state, or externally acquired data requires the exact approval appropriate to its effects. Customer communication and commercial decisions remain human-controlled.
