# Classic Automation additive complete crawler

## Purpose and authorized scope

This standalone workflow acquires public products into the local catalog. It
does not publish, push, deploy, read environment files, contact customers or
modify AUTO-001/AUTO-002. Existing products remain unchanged when the source
reorders or removes them. Availability, price and other commercial data are
not synchronized. Historical scripts/product-expansion-v18.js and
data/classic-crawl-state.json remain untouched.

The user approved all current categories below, including the full GE category
and Multilin. The public source-path/listing preflight verified 17/17 mappings.

| Local target | Public category path |
|---|---|
| Allen Bradley | parts/allen-bradley |
| ABB | parts/abb |
| Siemens | parts/siemens |
| Schneider | parts/schneider |
| Omron | parts/omron |
| Mitsubishi | parts/mitsubishi |
| Honeywell | parts/honeywell |
| Yokogawa | parts/yokogawa |
| Emerson | parts/emerson |
| GE / General Electric | parts/ge-general-electric |
| Bently Nevada | parts/bently-nevada |
| Foxboro | parts/foxboro |
| HIMA | parts/hima |
| Bachmann | parts/bachmann |
| Rexroth | parts/rexroth |
| ProSoft | parts/prosoft |
| Woodward | parts/woodward |

All public category URLs use https://www.classicautomation.com/. The adapter
reads the page's category-specific configuration and same-domain public SDK,
then reproduces its productSearch query at
https://commerce.adobe.io/search/graphql with the exact categoryPath filter.
Public header values are used in memory only, never persisted or logged.
The separately authorized catalog-service.adobe.io enrichment endpoint is
not needed. No redirects, private APIs, credentials, cookies, authentication
bypasses or unrelated tenants/catalogs are used.

The public SKU is the model, preserving revision slashes. Same-domain canonical
product URLs may be at the website root; they are stored, not crawled for
additional discovery. Public descriptions are converted to text. Same-domain
catalog image URLs are retained when present; otherwise the existing local
default image is used. There is no separate image acquisition engine.

## Commands and limits

Working directory: C:\Projects\globalplcparts.
Executable: C:\Program Files\nodejs\node.exe.

- node scripts/classic-automation-complete-crawl.js --controlled:
  12 items, one page, two minutes.
- node scripts/classic-automation-complete-crawl.js --batch:
  600 items, 50 pages, eight minutes.
- node --test tests/classic-complete-crawl.test.js:
  dedicated local tests only.

A batch handles the earliest incomplete brand. It ends at a sweep boundary,
budget, source failure or safety error. Every normal next run resumes pending
work or the saved sweep/page. Requests are sequential, at least three seconds
apart. Transport and 5xx failures allow two attempts with ten seconds before
the second. 401, 403 and 429 stop the batch without immediate retry or bypass.
The next periodic execution may retry. No external response bodies/headers
are included in error logs.

## Schema 2 and authorized migration

The first invocation with valid schema-1 state archives that state, snapshots
the complete current local catalog, and atomically replaces only the new crawl
state with schema 2. The authorized Allen Bradley reconciliation begins at
sweep/generation 2, page 1. All other unstarted brands remain generation 1,
page 1. Unexpected progress on another legacy brand blocks migration for review.
This is not a product reset. The original 12 acquisitions are preserved.

Runtime files, excluded from the code commit:

- data/products.json: additive catalog.
- data/classic-complete-crawl-state.json: schema-2 durable checkpoint.
- data/classic-complete-state-v1-backup.json: immutable pre-migration state.
- data/classic-complete-sweep-baseline.json: all 5,300 records preserved at migration.
- data/classic-complete-original-catalog.json: previous 5,288-record backup, retained.
- data/classic-complete-last-run.json: latest CLI batch summary, status and timestamp.
- data/classic-complete-catalog.lock and its temporary .recovery guard.
- Same-directory unique .tmp files used during atomic replacement.

Per brand, state records generation, current page, last committed page, starting
and latest source totals, current unique normalized SKU set, full pending items
and cursor, additions/skips/retries, cumulative counters, diagnostic page hashes,
previous sweep SKU set/hash and summary, stable-sweep count and completion
evidence. Only current and previous sweep sets are kept; history does not grow
by retaining every generation. The old schema-1 backup retains its diagnostics.

The migration baseline hash/count and every baseline record are checked on each
run. Missing/corrupted state never triggers a catalog reset. Unused temporary
files left by abrupt termination are not treated as authoritative state.

## Sweep/convergence rules

Each sweep starts at page 1. Source SKU identity is normalized independently of
page ordering. Fingerprints are DIAGNOSTIC: a changed page fingerprint is not a
blocker. Products that move, disappear or recur remain safe local records.

A successful confirming sweep requires:

1. Every page through the source's end was fetched and durably processed.
2. No pending or unresolved failed page remains.
3. Each response has consistent current-page, page-size, total-page and item-count
   metadata. Page size is 12.
4. The unique observed SKU count equals the source total.
5. The total did not change within this sweep.

Changes within a sweep do not permanently block collection. Additions are saved;
duplicate occurrences are skipped. If metadata or unique coverage is inconsistent,
or the total changes, the traversal is NON_CONFIRMING. State safely opens the
next generation at page 1 for a later batch. No product is removed. A network
failure is different: its page stays incomplete and resumes later.

A brand becomes COMPLETE only after two consecutive successful sweeps have the
same normalized SKU set and total, and the second adds zero local products.
Set equality is checked with sorted manifests plus deterministic hashes, not
counts alone. Reordering is acceptable. New identities or changed totals between
sweeps start another confirmation sequence. A non-confirming traversal breaks
the consecutive stable sequence. Empty categories also require two sweeps.

The full 17-category state becomes FULLY_COMPLETE only when every brand meets
that rule. Subsequent CLI executions validate local data, report COMPLETE,
exit 0 and make no network requests. Scheduler/state are retained. Continued
source activity can require further sweeps; completion describes observed
convergence, not perpetual synchronization with later source changes.

## Additive persistence and duplicate protection

Each fetched page's complete item queue is saved before processing. For each
new item the catalog is written durably before its queue cursor advances.
If the process stops between those writes, acquisition provenance (crawl ID,
generation and SKU) reconciles the already durable addition exactly once.
The page commits only after its pending queue is empty and the catalog remains
unchanged by other writers.

JSON writes use a unique same-directory temporary file, validation, fsync,
close, revalidation and rename replacement. The destination is never deleted
first. A failed replacement leaves the original destination intact.

Brand/model identity is NFKC-, whitespace- and case-normalized. GE, GE Fanuc,
General Electric and GE / General Electric variants share one identity.
The historical ge-fanuc slug/state namespace remains stable. Existing GE records
are not renamed. Slugs are also unique. A different identity that collides with
an existing slug blocks rather than silently merging distinct products.
Per-run lookup maps avoid repeated linear catalog searches.

All crawler instances share an exclusive file lock. Dead-owner recovery requires
the OS to report that PID no longer exists; live/reused PIDs, denied checks and
malformed locks fail closed. No process is killed. Other historical catalog
writers do not honor this lock and must not run concurrently. The new crawler
also checks the catalog's current bytes before replacement/page commit and blocks
on a detected external edit. No OS-wide transaction with unrelated writers is
claimed.

## Dedicated validation and controlled reconciliation

44 dedicated tests pass. Coverage includes increases/decreases, additions,
disappearances, page movement in both directions, reordered sets, changed
fingerprints, two-sweep convergence, equal-count/different-identity changes,
state-only migration, interrupted saves, pending queues, corruption, locks,
atomic writes, GE aliases, scope restrictions, network failures, all-brand
completion and no-network COMPLETE exits.

The controlled real migration/reconciliation on 2026-09-13 succeeded in 26.149
seconds. Allen Bradley generation 2 started at page 1, observed total 8,932,
skipped eight existing products and added four. Catalog: 5,300 to 5,304.
Page 1 committed durably; next page 2; pending zero; stable sweeps zero.
All 5,300 baseline records, including the previous 12 acquisitions, were verified
unchanged. Normalized identity and slug duplicates remained zero.

## Scheduling and code preservation

Authorized task: GPLP-CLASSIC-COMPLETE-CRAWL.
Account: DESKTOP-EVEM1EN\User, S4U/password-free, limited rights.
Action: verified Node executable with the absolute new crawler path and --batch.
Working directory: C:\Projects\globalplcparts.
Cadence: every 15 minutes; IgnoreNew; StartWhenAvailable; zero scheduler failure
restarts; no wake; normal AC conditions; 12-minute scheduler limit. The internal
eight-minute budget leaves time for bounded in-flight requests/writes.

The user authorized one controlled scheduled acceptance run after registration.
Use its latest-run JSON, task run information and catalog/state validation to
verify resume, progress, integrity, return to Ready and next run time. Compare
AUTO-001/AUTO-002 definition hashes before and after; do not change those tasks.

The user authorized a LOCAL commit of implementation, dedicated tests and
documentation after successful controlled reconciliation. Stage only those exact
files. Runtime acquisition/state/backups/logs/locks/temp files must stay out.
No automated publication, additional commits by the runner, push or deployment
is part of scheduling.
