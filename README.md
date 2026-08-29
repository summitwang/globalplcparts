# GlobalPLCParts

GlobalPLCParts is a commercial website for browsing industrial automation parts and submitting requests for quotation (RFQs). The repository contains a public product catalog, brand and blog content, search, analytics integrations, an RFQ intake flow, and local admin tools for managing RFQs and importing catalog data.

This project operates in **supervised mode**. Local inspection, development, and validation may be performed when requested, but production changes and commercial actions require the approvals described below.

## Technology stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase for RFQ records and attachment storage
- Resend for RFQ notification and acknowledgement email
- Google Analytics 4 and Microsoft Clarity for browser analytics
- jsPDF, SheetJS (`xlsx`), and FileSaver for CRM exports
- Axios, Cheerio, and Playwright for repository scripts and scraping utilities
- ESLint with Next.js Core Web Vitals and TypeScript rules

The repository uses a newer Next.js version with breaking changes. Before changing Next.js application code, consult the relevant installed documentation under `node_modules/next/dist/docs/` rather than relying on older framework conventions.

## Main public routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage with featured products, brands, search, and RFQ links |
| `/products` | Paginated product catalog with filtering |
| `/products/[slug]` | Individual product detail page |
| `/brands` | Brand directory |
| `/brands/[slug]` | Brand landing page and related products |
| `/search?q=...` | Paginated catalog search |
| `/blog` | Blog index |
| `/blog/[slug]` | Individual blog article |
| `/request-quote` | Public RFQ form and attachment upload |
| `/robots.txt` | Generated crawler rules |
| `/sitemap.xml` | Generated sitemap for public, product, brand, and blog routes |

## Admin routes

| Route | Purpose |
| --- | --- |
| `/admin` | Redirects to the RFQ CRM |
| `/admin/rfq` | RFQ management, pipeline fields, notes, and CSV/Excel/PDF exports |
| `/admin/scraper` | Password-protected product spreadsheet import interface |
| `/admin/image-manager` | Product and brand image statistics |

Related API routes are located under `app/api/admin/` and `app/api/rfq/`. The current admin implementation uses an admin password for protected RFQ and import operations; it is not a multi-user role-based authentication system. Admin routes and customer data must be treated as sensitive.

## RFQ/CRM architecture

The public RFQ page is implemented in `app/request-quote/page.tsx`. It collects contact and part-request information and accepts supported document or image attachments up to the application-defined size limit.

The RFQ flow uses:

1. `POST /api/rfq` to validate the request, upload an attachment when supplied, insert a record into the Supabase `rfq_requests` table, and conditionally request notification emails through Resend.
2. The Supabase `rfq-files` storage bucket for RFQ attachments.
3. `GET /api/admin/rfq` to load RFQ records for the admin CRM.
4. `PATCH /api/admin/rfq` to update the allowed CRM fields.
5. `POST /api/rfq/quote` as the server endpoint for quotation email handling and quote-status updates.
6. `app/admin/rfq/page.tsx` for CRM display, pipeline updates, internal notes, quote fields, follow-up information, and local exports.

RFQ records and attachments may contain customer and commercially sensitive information. Do not expose real RFQ data in logs, documentation, screenshots, tests, or public examples. Do not send a quotation or customer message without direct human action and approval.

## Product catalog architecture

The active catalog is stored in `data/products.json` and imported through `data/products.ts`, which defines the application-facing `Product` type. Public product, brand, search, sitemap, and related-content pages read this catalog at application/build time.

Product images are stored under `public/product-images/`. `components/ProductImage.tsx` provides image rendering and fallback behavior, while `lib/image-mapper.ts` contains image-mapping support.

The `scripts/` directory contains multiple generations of product import, expansion, cleanup, scraping, image mapping, and image auditing tools. Many of these scripts can overwrite catalog files or download/write images. Do not assume that the highest version number is approved for use, and do not run a mutating catalog or scraping script without first reviewing its inputs, outputs, network behavior, and rollback plan.

The admin spreadsheet importer writes to `data/products.json` and records import history in `data/import-log.json`. Catalog imports and bulk changes require explicit user approval.

## Blog and SEO architecture

- `data/blog-posts.ts` stores blog article data.
- `data/brand-seo.ts` stores enhanced brand-specific introductions, keywords, and FAQs where defined.
- `app/blog/` renders the blog index and article routes.
- `app/brands/` renders brand directory and brand landing pages.
- Product, brand, and blog detail routes generate route-specific metadata.
- Detail pages include structured data where implemented.
- `app/sitemap.ts` builds the sitemap from static routes, products, brands, and blog posts.
- `app/robots.ts` generates crawler rules.
- `app/layout.tsx`, `components/AnalyticsTracker.tsx`, and `lib/analytics.ts` provide global metadata and analytics integration.

Generated or imported content must be checked for factual accuracy, title/description consistency, duplication, image relevance, and unsupported business claims before publication.

## Important directories

| Path | Contents |
| --- | --- |
| `app/` | Next.js routes, layouts, pages, metadata, and route handlers |
| `app/api/` | Public RFQ and admin API route handlers |
| `app/admin/` | Local admin interfaces |
| `components/` | Shared React components |
| `data/` | Product catalog, blog content, SEO content, import logs, and image/crawl reports |
| `lib/` | Supabase client, analytics helpers, and image mapping |
| `public/brand/` | Brand and site identity assets |
| `public/product-images/` | Local catalog image library |
| `scripts/` | Import, cleanup, generation, scraping, mapping, and audit utilities |
| `node_modules/next/dist/docs/` | Installed documentation for the repository's Next.js version |

## Local development

Prerequisites:

- Node.js
- Dependencies installed from `package-lock.json`
- A local `.env.local` containing the required environment variables

Do not print, copy, commit, or share `.env.local` or its values.

Start the development server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

On Windows PowerShell systems where script execution blocks `npm.ps1`, use the command shim:

```powershell
npm.cmd run dev
```

Do not run the catalog/import/scraping npm commands merely to verify local development. Many of them mutate repository data or make external requests.

## Build and validation

Standard non-mutating application checks are:

```bash
npm run lint
npm run build
```

On Windows PowerShell, use `npm.cmd` if required:

```powershell
npm.cmd run lint
npm.cmd run build
```

For a meaningful code change, inspect the relevant files and Git status first, preserve unrelated work, and run checks appropriate to the change. A successful local build does not authorize deployment.

The repository also exposes numerous data and image scripts through `package.json`. Review the target script before running it. Commands with names such as `scrape`, `import`, `expand`, `clean`, `fix`, `map`, `update`, or `backfill` should be considered potentially mutating and/or networked.

## Environment variables

Only variable names are documented here. Never add real values to tracked files, logs, documentation, screenshots, commits, or chat output.

| Variable name | Repository use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL used by browser code and as a server fallback |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anonymous key used by browser code and as a server fallback |
| `SUPABASE_URL` | Server-side Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase credential |
| `RESEND_API_KEY` | Server-side Resend email integration |
| `ADMIN_PASSWORD` | Current password check for protected admin operations |

Keep server-only variables server-side. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, or `ADMIN_PASSWORD` to browser code. Environment files are ignored by Git through the `.env*` rule in `.gitignore`.

## Production safety rules

- The project is in supervised mode.
- Prefer small, reversible, reviewable changes.
- Never deploy, push production changes, or change production services without explicit approval.
- Never delete production database records, storage objects, files, domains, branches with unmerged work, or credentials without explicit approval.
- Never force-push, rewrite published history, or use destructive Git cleanup on user work.
- Never commit secrets or real customer data.
- Inspect database schema and application usage before proposing schema changes; prefer reversible migrations.
- Preserve unrelated working-tree changes.
- Summarize changes, validation, remaining risk, and rollback considerations before requesting deployment approval.
- Do not independently change prices, payment instructions, shipping charges, supplier costs, or discounts.

## Tasks requiring explicit user approval

The following actions require explicit user approval before execution:

- Production deployment or changes to production services
- Git push to a production branch
- Database schema migrations or production data changes
- Supabase RLS, storage policy, bucket, or retention changes
- Credential rotation or deletion
- DNS, domain, payment, or production configuration changes
- Dependency additions, removals, or substantial upgrades
- Bulk product imports, cleanup, expansion, removal, or image replacement
- Running scraping or other external-data collection tools
- Publishing or removing substantial batches of catalog, blog, or SEO content
- Customer-data exports or changes to RFQ communication behavior
- Destructive file, branch, storage, or database operations

Approval for analysis or a local code change does not imply approval for deployment or production mutation.

## Tasks that remain human-controlled

Codex and other automation must not independently:

- Reply to customer RFQs
- Send quotations
- Negotiate prices or approve discounts
- Confirm product availability, authenticity, condition, or lead time
- Promise delivery dates
- Accept payments or change payment instructions
- Communicate with suppliers on behalf of the business
- Send email, WhatsApp, social messages, or other customer communications
- Make pricing, shipping-charge, supplier-cost, or commercial-commitment decisions

Automation may prepare drafts or analysis for human review when explicitly requested. A human is responsible for the final decision and transmission.

## Troubleshooting

### `npm` is blocked by PowerShell execution policy

Use `npm.cmd` instead of the PowerShell script wrapper:

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

### Missing Supabase URL or key

Confirm that the required variable names are present in the local environment. Do not print their values. Server code accepts the server-specific Supabase names and currently falls back to the corresponding `NEXT_PUBLIC_` names.

### RFQ records do not load in the admin CRM

Check the local server output for a sanitized error, confirm that the Supabase project is available, and verify that the required local environment variable names are configured. Do not expose customer records or credentials while diagnosing the issue.

### RFQ email is not sent

Confirm that `RESEND_API_KEY` is configured in the intended environment and inspect server-side errors without printing the key or customer data. Database insertion and email delivery are separate operations.

### Product image is missing or incorrect

Check the product's `image` path in `data/products.json` and confirm the corresponding file exists under `public/`. Use read-only image audits first. Image mapping and repair scripts may overwrite catalog data and require review and approval before use.

### Catalog changes do not appear

The application reads `data/products.json` through `data/products.ts`. Confirm that the intended local data file changed, then restart or rebuild as appropriate. Do not run an importer or generator as a troubleshooting shortcut.

### Next.js behavior differs from expected conventions

Read the relevant installed guide under `node_modules/next/dist/docs/`. This repository's Next.js version may differ from older documentation and training examples.
