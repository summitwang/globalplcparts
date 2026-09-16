# PRODUCTION RELEASE v1 - revision 2

Frozen local release; no publication or production mutation performed.

## Immutable identity

- Base / owner-confirmed rollback production commit: 6f0772505967e1a1300b4dfe613e6b7331dd232b.
- Original release commit: 1aee69ccda921fde7bbfb249871642ba62ca8a6c; original local tag production-release-v1 is preserved.
- Revised HEAD: resolve immutable local tag production-release-v1-revision-2 using `git rev-parse refs/tags/production-release-v1-revision-2^{commit}`. Tag is created after this commit; final report records the literal hash.
- Branch: release/production-v1. Checkout: C:/Projects/globalplcparts-release-v1.
- Frozen at: 2026-09-16T03:16:33.733Z.
- Catalog: **13,695 products**; SHA256 **8dc277d9d5e09daf1cc8c3765b7b0e806414608824a6b22cfb3eee045141571c**.
- Raw frozen snapshot SHA256: 71aa14c948425945aa8dd5aa0aaf7c19b6ccda919f933c77c3702bd93ffbd65e.
- Reviewed application code HEAD: 55feca433be39cd48cdc265dd35a5d3b430de3f9. Revision changes only release documentation, manifest and narrow .gitignore safeguards.

## Catalog and validation

Unchanged publication retains all 5,288 original products and adds 8,407 frozen products. Only acquisition metadata was removed from additions. No moving crawler snapshot was copied. Both approved image-only repairs remain: siemens-s7-400 and siemens-et200 use /product-images/default.jpg. Zero duplicate identities, duplicate slugs or broken image references; 1,570 unique image files referenced.

Sitemap: **14,577 URLs**, product chunks 5,000 / 5,000 / 3,695. Canonical: **https://globalplcparts.com**.

Prior validation remains applicable: 57 SEO tests, 29 local HTTP checks, production build/TypeScript PASS, lint PASS with existing ProductImage warning, health 15 PASS / 4 WARN / 0 FAIL during preparation. No application code/dependencies change. Lightweight verification:

    node docs/releases/verify-production-release-v1.cjs

Do not deploy local .next output; earlier build used synthetic configuration. Vercel must rebuild committed source with configured Production variables. No customer/RFQ/payment/supplier operation performed.

## LEGACY ARTIFACT EXCEPTION ? RELEASE v1

These nine paths exist unchanged in production base 6f0772505967e1a1300b4dfe613e6b7331dd232b. None was introduced or changed anywhere in the release commit chain. User explicitly accepts them for Release v1 only. They are not newly generated release artifacts.

| Inherited path | Direct dependency | Immediate deletion risk |
|---|---|---|
| data/classic-crawl-state.json | Historical product-expansion-v18.js checkpoint; no public application/build dependency found. | Deleting resets historical crawler progress. |
| data/image-cache-v20.json | Historical product-image-engine-v20.js cache; no application/build dependency found. | Deleting discards cache and can repeat network work. |
| data/image-cache-v21.json | Historical product-image-engine-v21.js and v21-5.js cache; no application/build dependency found. | Deleting discards cache and can repeat network work. |
| data/image-library-needed.json | image-library-audit-v6.js generated output; no application/build input found. | Deleting loses audit evidence; explicit audit can regenerate. |
| data/image-state-v20.json | Historical product-image-engine-v20.js progress; no application/build dependency found. | Deleting resets historical image-engine progress. |
| data/image-state-v21.json | Historical product-image-engine-v21.js and v21-5.js progress; no application/build dependency found. | Deleting resets historical image-engine progress. |
| data/import-log.json | app/api/admin/scraper/start/route.ts reads/appends import history, with missing-file empty-array fallback. | Deleting loses import history; does not prevent build or route operation. |
| data/products-scraped.json | scrape-products.js staging output; no application/build input found. | Currently empty; deletion removes historical staging output. |
| data/reports/image-check-report.json | check-product-images.js output; no application/build input found. | Deleting loses audit report; explicit image check can regenerate. |

No public-page or build requirement found. Admin import-history route reads import-log.json with empty-array fallback; historical scripts use noted state/cache files. This is static dependency inspection, not execution. No files deleted or untracked.

Future runtime artifacts are NOT authorized. Hygiene/removal is separate post-release maintenance. Narrow .gitignore rules cover known crawler checkpoints/backups/locks/temporary files, image-repair ledger, generated report directories and exact legacy output paths. Legitimate data such as products.json, SEO inventories, fixtures and source code remain eligible for tracking.

**.gitignore does not untrack existing files, prevent tracked changes, or prohibit force-add.** Do not force-add runtime output. Before future releases inspect staged diffs and the complete release change set against base. Reject new runtime artifacts or changes to these nine paths without separate explicit review/authorization. Never copy moving crawler state into a frozen release.

Pattern-based secret scans cover accepted legacy files and release-chain text changes. No candidates detected; no values printed. This is not a guarantee that every historical secret is absent.

## Domain routing and deployment trigger

Owner manually verified in Vercel:

- globalplcparts.com -> Production
- www.globalplcparts.com -> 308 Permanent Redirect -> globalplcparts.com
- Production Branch: main
- Every push to main creates a Production Deployment.

Preceding read-only HTTP preflight confirmed apex robots.txt 200 and www robots.txt 308 to matching apex path. Previous routing conflict resolved. No DNS migration performed or claimed; Codex changed no Vercel, Cloudflare or DNS settings.

## Production environment evidence

User visually verified variable-name entries in Vercel for Production/Preview where shown:

- ADMIN_PASSWORD
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_URL
- RESEND_API_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL

Names match application code and local health-check inventory. Server Supabase URL/key have public-variable fallbacks. Values neither inspected nor recorded/requested. Visual evidence establishes entry presence, not live transaction or secret-value validation.

## Publication and rollback - not executed

Publication requires separate explicit authorization because pushing main triggers Production. Recheck remote main, clean checkout, immutable tag and catalog immediately beforehand. Stop if remote main differs from reviewed base. Do not force push or silently rebase.

Proposed command, only after separate authorization:

    git push origin refs/tags/production-release-v1-revision-2:refs/heads/main

Owner-confirmed rollback production commit: 6f0772505967e1a1300b4dfe613e6b7331dd232b. Vercel deployment ID not supplied; resolve known commit to its deployment before separately approved rollback. Re-promote matching application/catalog/assets together, retaining confirmed routing unless separately authorized. Git recovery requires reviewed recovery/revert commit; never force push/reset active crawler. Prior 5,288-product catalog and old image references remain recoverable from base.

## Readiness

Release v1 preflight ready under explicit unchanged-legacy exception, subject to final lightweight verification of revised commit. Manifest records all nine blob identities, exception, routing and environment-name evidence. Original release tag preserved; revision uses new immutable local tag.

No catalog, application code, crawler state/task, production infrastructure or data modified. No push or deployment occurred.
