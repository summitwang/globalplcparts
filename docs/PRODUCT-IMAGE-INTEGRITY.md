# Product image integrity

The canonical fallback is `/product-images/default.jpg`, physically under
`public/product-images/default.jpg`: a repository-owned, brand-neutral PLC
illustration, 640 by 640 pixels, JPEG, 12,078 bytes. It was drawn locally from
original geometric shapes, without downloading or reusing third-party artwork.
The old `library/default.jpg` and two Siemens files were empty; none was overwritten.

## Local checks and repair

```powershell
node scripts/product-image-integrity.js --check
node scripts/product-image-integrity.js --repair
```

Check mode performs no writes or network calls and returns 2 for invalid catalog,
broken application image references or a missing canonical fallback. JSON output
includes counts, classified failures, reuse, legacy `/real/` and `/library/` paths,
and catalog-unreferenced files. Orphan counts do not establish that a file is unused
elsewhere; no files are deleted. Initial audit artifacts are retained under
`reports/product-image-integrity/audit-before.json` and `audit-before.md`.

Repair mode takes the existing Classic crawler catalog lock; an active owner
returns LOCKED without changes. It never stops a crawler or changes a scheduled
task. It preserves valid local images and replaces absent, malformed, remote,
missing or invalid-file references with the canonical fallback. No download,
hotlink substitution, model/brand/slug/sourceUrl/acquisition change is made.

Before atomic replacement, it saves the full validated catalog under
`reports/product-image-integrity/<repairId>/catalog-before.json`. A hash receipt
in `data/product-image-repairs.json` is written before the catalog rename. This
lets an interrupted operation retry without losing the authorization evidence.
Repeated successful repairs are NOOP and create no further backup or catalog write.
The receipt, backups, reports and runtime catalog must stay out of code commits.

## Baseline safety and future acquisition

Crawler state and original baseline files are never rewritten. The crawler and
finalizer accept an image-only deviation from a preserved baseline record only
when its full before/after object hashes match a repair receipt, all non-image
fields are byte-for-byte equivalent, and the new image is the canonical fallback.
Unrecorded image edits and every identity change still fail preservation checks.
Keep the receipt together with runtime data; losing it fails closed.

The Classic crawler and the application's manual import normalization use the
same filesystem validator. Supported local `/product-images/` paths must remain
inside public, without traversal/query/fragment/symlink components, refer to a
nonempty regular file and have a matching supported image header. Optional source
image URLs remain available in source listing state but never become application
hotlinks. Source product URL validation and crawler completion policy are unchanged.

The central ProductImage component rejects nonlocal/invalid sources before
rendering, falls back on load failure without looping, and handles prop changes.
Product detail and brand cards always use it even when image is absent. The
existing card dimensions/classes remain. The image-path debug text is removed.

Existing historical image engines and scraper writers were located but not run
or broadly rewritten. They remain unapproved maintenance tools. Running them later
requires their own authorization and an image-integrity check afterward. The active
Classic workflow and manual import normalization enforce this policy now.

## Validation and diagnostics

Run the dedicated image, crawler and finalizer suites together:

```powershell
node --test tests/product-image-integrity.test.js tests/classic-complete-crawl.test.js tests/classic-lifecycle.test.js
node scripts/health-check.js
```

Health checks now treat unverified remote images and invalid image files as failures;
fallback/reuse warnings remain visible. They are not suppressed to produce a pass.

AUTO-001's saved 2026-09-12 report exited 1 because 12 image references were missing.
AUTO-002's read-only collector currently exits BLOCKED with DIRTY because the live
crawler's runtime changes exceed its existing Stage-1 Git allowlist. That is separate
from image integrity. Its policy, baseline, schedules and task definition are unchanged.
Neither task was manually executed. No commit of runtime data is used to evade that check.

## Controlled local acceptance (2026-09-13)

Initial audit: 7,568 products; 5,286 valid local references, 1,098 missing canonical
fallback references, 1,182 remote URLs and two zero-byte Siemens image files.
Creating the fallback resolved the 1,098 missing-file references without catalog
edits. The crawler continued adding valid fallback references during implementation.

With its lock released, one repair preserved the 7,679-product count and replaced
1,184 image fields (1,182 remote URLs plus two empty files). Every non-image field
and the entire crawler state file remained unchanged. After repair: 7,679 valid
local references, 2,393 canonical fallback references, no remote/broken references,
no duplicate identities or slugs. All 5,300 baseline records passed the preservation
check with the narrowly recorded image corrections.

The dedicated suites passed 107 tests; TypeScript and the production build passed.
Focused lint has no errors and retains the existing plain-img advisory. The health
check returned 15 PASS, 4 WARN, 0 FAIL. Remaining warnings are working-tree changes,
fallback usage, heavy image reuse and historical high-risk script inventory.
