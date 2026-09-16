# PRODUCTION RELEASE v1

This is a frozen local release candidate, not a published deployment. Package preparation is complete; production promotion remains blocked by the owner-verification items below.

## Immutable identity

- Frozen: 2026-09-16T03:16:33.733Z (11:16:33.733 Singapore, 16 September 2026).
- Base origin/main: 6f0772505967e1a1300b4dfe613e6b7331dd232b.
- Reviewed code HEAD: 55feca433be39cd48cdc265dd35a5d3b430de3f9.
- Release HEAD: resolve local tag **production-release-v1** with `git rev-parse refs/tags/production-release-v1^{commit}`. The tag is created after the commit and must never be moved. A commit cannot embed its own hash; the resolved receipt and final report supply the literal hash.
- Release branch: release/production-v1. Checkout: C:\Projects\globalplcparts-release-v1.
- Publication catalog SHA-256: 8dc277d9d5e09daf1cc8c3765b7b0e806414608824a6b22cfb3eee045141571c.
- Raw frozen snapshot SHA-256: 71aa14c948425945aa8dd5aa0aaf7c19b6ccda919f933c77c3702bd93ffbd65e.

The raw catalog was read once from the atomically replaced crawler file, parsed and validated, then frozen outside Git. Publication removes only acquisition metadata from 8,407 records. It preserves all other fields, including source URLs, identity, slugs, brand, descriptions, existing public metadata and image references. No later acquisition is included. The publication file is committed with LF enforced for reproducible cross-platform hashing.

## Catalog review

Previous public/Git catalog: 5,288. Frozen publication: **13,695**. ClassicAutomation source label: **12,697**. Added: **8,407**. Removed: **0**. Existing records changed: **2**, image field only:

- siemens-s7-400: /product-images/real/siemens/siemens-s7-400.jpg -> /product-images/default.jpg
- siemens-et200: /product-images/real/siemens/siemens-et200.jpg -> /product-images/default.jpg

The canonical fallback JPEG and all 1,570 referenced image files are already in the inherited reviewed Git tree. Invalid old image files remain unreferenced; nothing was deleted. Every original product is retained. No runtime state, receipt, backup, lock or operational acquisition object is published.

Machine-readable review: [catalog diff](PRODUCTION-RELEASE-v1.catalog-diff.json). Machine-readable full manifest: [release manifest](PRODUCTION-RELEASE-v1.json). The manifest lists the complete changed-file set and all seven inherited commit hashes, plus the release tag.

## Reproducible validation

Run these from this isolated checkout, never the active crawler checkout:

    npm.cmd ci --offline --ignore-scripts --no-audit --no-fund
    node docs/releases/verify-production-release-v1.cjs
    node --test scripts/seo-operations.test.js
    npm.cmd run lint
    node node_modules/eslint/bin/eslint.js scripts/seo-operations-report.js scripts/seo-operations.test.js scripts/seo-http-test.js docs/releases/verify-production-release-v1.cjs
    npm.cmd run health-check

If the lockfile packages are not cached on another machine, obtain approval for registry access before installing the same lockfile; do not update dependencies.

For a local source-build check without copying credentials, use process-only validation values:

    $env:NEXT_PUBLIC_SUPABASE_URL='https://release-validation.invalid'
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY='release-validation-placeholder'
    $env:SUPABASE_URL='https://release-validation.invalid'
    $env:SUPABASE_SERVICE_ROLE_KEY='release-validation-placeholder'
    $env:RESEND_API_KEY='release-validation-placeholder'
    npm.cmd run build
    node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101

In a second terminal in the release checkout:

    node scripts/seo-http-test.js http://127.0.0.1:3101

Do not deploy this local .next output: it deliberately contains placeholder public environment configuration. The approved deployment must rebuild the committed source with verified project production variables. No .env file was copied or committed, and no RFQ, payment, customer or supplier operation was executed.

Completed results: **57 SEO tests**, **29 HTTP checks**, production build/TypeScript PASS, catalog/image integrity PASS with zero duplicates and zero broken images. Lint PASS with the existing ProductImage native-img warning; verifier lint PASS. Health **15 PASS / 4 WARN / 0 FAIL** during preparation (expected dirty release worktree, image fallbacks/reuse, historical script inventory). Sitemap **14,577 URLs**, with product chunks **5,000 / 5,000 / 3,695**. HTTP checks cover robots, sitemap index/children, canonical host, true 404s, redirects and JSON-LD. The existing blog editorial warnings are not silently removed.

## Canonical/domain decision

Selected host: **https://globalplcparts.com**. Code canonicals, sitemap URLs, robots sitemap reference, Open Graph and structured data agree on apex, with no SEO environment-variable dependency. No repository configuration forces apex to www.

Prior read-only public checks found HTTP 307 apex -> www, while www serves the application. This is external deployment/domain routing; the exact Vercel/Cloudflare rule has not been verified. Required owner-reviewed configuration plan:

1. Inspect Vercel Project Settings > Domains and Cloudflare redirect/worker rules for both existing hosts. Record current settings before editing. Identify the single rule producing apex -> www; do not alter unrelated rules.
2. After explicit authorization, configure apex as the serving production domain and www as a permanent 301/308 redirect to apex, preserving path/query. Remove/replace only the conflicting apex -> www redirect. No DNS change is planned merely to reverse a redirect; verify existing host attachments first.
3. Confirm no redirect loop: apex serves 200 for valid pages, www redirects once to matching apex path/query. Check robots.txt, sitemap.xml, every sitemap child, representative product/brand/blog pages and missing-record 404s.
4. Repeat canonical/OG/JSON-LD checks on the public production origin after the separately approved promotion.

No DNS, Cloudflare, Vercel or production configuration was changed here.

## Deployment trigger and rollback identity

Classification **D: cannot be determined locally**. No tracked deployment workflow/vercel.json or local Vercel project link establishes the production branch or Git integration behavior. Public Vercel response headers are not proof that a main push deploys production. Treat main push as potentially production-impacting until the owner verifies the actual settings.

Actual production Git commit: **UNKNOWN**. Actual production deployment ID: **UNKNOWN**. Do not substitute origin/main or X-Vercel-Id (request identity) for the deployed commit/deployment identity.

The old 5,288-product catalog remains recoverable from commit 6f0772505967e1a1300b4dfe613e6b7331dd232b, blob 11d4101df55db593a7b119d198036b43fbfb427b. Rollback readiness is **NO** until the actual deployed application/asset identity and domain rules are recorded. The manifest contains its catalog SHA-256.

## Exact push/promotion sequence ? not executed

1. Owner verifies Vercel/GitHub production branch, automatic deployment triggers and branch protection; records the current production deployment ID and domain configuration. Obtain explicit authorization before any push/preview publication or production change.
2. From the release checkout, verify catalog SHA and release tag. Fetch remote main and require it still to be an ancestor of the tagged release. Stop on any failed check or unexpected branch/tag state. Do not rewrite history.

       git fetch origin main
       git rev-parse refs/tags/production-release-v1^{commit}
       git merge-base --is-ancestor origin/main refs/tags/production-release-v1
       git status --porcelain
       node docs/releases/verify-production-release-v1.cjs

3. After confirming release-branch pushes cannot automatically promote production, publish only the reviewed release branch, if explicitly authorized:

       git push --dry-run origin refs/heads/release/production-v1:refs/heads/release/production-v1
       git push origin refs/heads/release/production-v1:refs/heads/release/production-v1

4. Rebuild and validate an explicitly approved preview with the project's verified environment. Preview must contain the exact frozen catalog hash/count, repaired images and expected SEO behavior. Do not run customer transactions for these checks.
5. Obtain final promotion and routing approval. Use the verified platform workflow. If main push is the production trigger, require the same tagged release and ancestry checks immediately before pushing; respect branch protection/PR requirements:

       git push --dry-run origin refs/tags/production-release-v1:refs/heads/main
       git push origin refs/tags/production-release-v1:refs/heads/main

The tag is lightweight and resolves to the exact release commit. No force options. If remote main advanced divergently, stop and review; do not force, reset or silently rebase the frozen candidate. A tag push, if separately desired, is also a publication action and was not performed.
6. Promote the exact validated source/deployment and apply only the authorized domain-routing correction. Verify public catalog count, source snapshot, both Siemens image paths, robots, sitemap index/chunks, canonical host, noindex and 404 behavior.

## Rollback procedure

Before promotion record the exact current deployment ID, its Git/artifact identity, environment configuration names, matching catalog/assets and the precise host routing. On failure re-promote that known-good immutable deployment and restore only the recorded routing configuration. Do not fabricate a rollback target from the local base hash. If a Git-based recovery is required, prepare a reviewed revert/recovery commit or separate checkout at the known-good deployment commit; never force push or reset the active crawler checkout. The prior catalog can be inspected with:

    git show 6f0772505967e1a1300b4dfe613e6b7331dd232b:data/products.json

Application, catalog and assets roll back together. Restoring the prior production deployment may temporarily restore its 5,288-product catalog and old image references; make that explicit to the owner. Keep the new release tag and the active crawler's newer runtime catalog/checkpoint intact for diagnosis and a later release.

## Readiness

**Local release package: READY. Production promotion: BLOCKED.** Remaining gates: verify trigger behavior and actual rollback identity, approve/fix external host routing, and rebuild with verified production configuration. The active crawler remains independent; no task definition, architecture or checkpoint was changed. No push, deployment or production mutation occurred.
