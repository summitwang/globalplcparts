# GPLP-AUTO-002 — Daily Operations Report

## Authority and Stage 1 status

Class A, local-only, stdout-only, **MANUAL ONLY**. Implementation and one manual
review run are authorized by the Stage 1 request. This contract does not enable
recurring execution or authorize future runs, remediation, publication or deployment.
AGENTS.md and the autonomous workflow, production guardrails and scripts safety
registry remain authoritative. Customer and commercial decisions remain human-controlled.

Exact manual command, from `C:\Projects\globalplcparts`:

```powershell
node scripts/daily-operations-report.js
```

No arguments, environment-based options, npm entry point, scheduler, wrapper,
report destination, history file or baseline file is supported. Output is text on
stdout only; do not redirect it to a persistent operational report in Stage 1.
The collector uses Node built-ins and never imports application modules or other
repository scripts. Its exports are only a synthetic-test seam; alternate roots,
Git adapters and test callbacks cannot be selected by its CLI.

## Exact input allowlist

All paths below are relative to the fixed repository root.

| Access | Paths |
| --- | --- |
| UTF-8 text/data reads | `data/products.json`, `data/blog-posts.ts`, `package.json`, `docs/SCRIPTS-SAFETY-REGISTRY.md` |
| UTF-8 source text, never executed | `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/products/[slug]/page.tsx`, `app/brands/[slug]/page.tsx`, `app/blog/[slug]/page.tsx` |
| Existence/file metadata only | `app/page.tsx`, `app/products/page.tsx`, `app/brands/page.tsx`, `app/search/page.tsx`, `app/blog/page.tsx` |
| Directory listing only, no script contents | Immediate entries of `scripts/`; inventory counts regular `.js` files |
| Referenced image metadata only, never image contents | Catalog paths below `public/product-images/`, limited to SVG, PNG, JPEG/JPG, WebP, GIF, AVIF; permitted characters are ASCII letters/digits, underscore, space, dot, parentheses, slash, plus and hyphen |
| Filesystem identity metadata | Root/path ancestors and `.git` directory identity |
| Git-managed inspection | Repository identity, current branch/HEAD and working-tree status through the fixed commands below; no raw path names, branch names or Git errors are output |

No recursive source scan. No data directory scan. Optional catalog fields are not
reported or used for commercial analysis. JSON parsing necessarily loads the
allowlisted catalog file, including unused fields; it does not open source URLs
or referenced external records. Selected fields must be strings when present.
Arrays must contain objects and have at most 100,000 rows. Empty/missing required
fields and empty catalog/blog arrays are integrity findings. Non-JSON blog expressions or changed export syntax
are rejected, never evaluated. Text inputs are limited to 32 MiB each and strict UTF-8.

Fixed Git executable: `C:\Program Files\Git\cmd\git.exe`. Every invocation uses
`--no-optional-locks -c core.fsmonitor=false -c core.untrackedCache=false`, followed by
one of these exact argument lists:

```text
rev-parse --show-toplevel
rev-parse --verify HEAD
rev-parse --abbrev-ref HEAD
status --porcelain=v1 -z --untracked-files=all --ignore-submodules=all
```

These process-local `-c` options do not write Git configuration. Child environment
is literal: `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=NUL`,
`GIT_TERMINAL_PROMPT=0`; parent environment values are not read or forwarded.
Git uses local repository metadata/configuration and ordinary working-tree status
inspection. The collector does not open `.git` payloads itself. A missing Git
installation, unsafe ownership or failed Git inspection is BLOCKED; never repair
configuration or add a safe-directory exception automatically.

Git is checked before and after collection. Only changes to these reviewed Stage 1
paths may coexist with this manual implementation run:

- `scripts/daily-operations-report.js`
- `tests/daily-operations-report.test.js`
- `docs/DAILY-OPERATIONS-REPORT-CONTRACT.md`

Other dirty paths or renames block collection. Accepted dirty state remains an
ATTENTION finding, not authorization to discard, stage, commit or publish it.

## Metrics and interpretation

- Catalog: product, brand and category counts; records missing slug/brand/model/category,
  brandSlug or description; duplicate slug/description groups; brands mapping to
  multiple brandSlugs. Grouping trims whitespace and otherwise preserves case.
- Images: unique nonempty paths, empty references, remote reference count, missing
  local references, SVG reference count/percentage, paths reused by at least 20
  products, affected products/percentage, maximum reuse. Missing-file counts are
  product-record counts, not distinct file counts. SVG is a proxy, not proof of
  fallback use. Runtime fallback events, visual correctness, dimensions, corruption,
  licensing and image acquisition are outside this stage.
- Blog: record/category counts, missing required fields, duplicate slug/title
  groups, distinct date count, invalid calendar dates, descriptions shorter than
  200 trimmed characters. Length/date concentration are review proxies, not proof
  of inadequate content or publication time.
- SEO/routes: missing public route files; counts of the three detail sources
  containing metadata/canonical/structured-data markers; layout metadata, sitemap
  catalog/blog/current-date and robots sitemap markers. These are text matches,
  possibly in comments, not parsed or rendered behavior. A current-date sitemap
  marker must not be used as evidence that content changed.
- Scripts: immediate JavaScript file count, AUTO-001-compatible filename risk
  heuristic, existing scripts with high-risk registry rows, scripts lacking registry
  table rows, missing simple `node scripts/name.js` package targets, raw
  `check-images` key occurrences. No command is executed. The last metric is a
  narrowly named ambiguity check, not a general duplicate-JSON-key parser. Scripts
  missing registry rows remain unclassified; presence is not execution or compromise.
- Git: clean/dirty state, changed-path count and MAIN/DETACHED/OTHER branch class.
  Commit and raw status are compared in memory only; arbitrary branch/path text is
  suppressed. No remote fetch, author/message history or remote-state claim.

Metric definitions intentionally differ from AUTO-001 in some whitespace/format
validation details. Its 72/36/37 reference counts are not an AUTO-002 baseline.

## Baseline, status and prioritization

No AUTO-002 baseline is established. Every CLI run reports **NOT ESTABLISHED** and
trends **NOT AVAILABLE**, not zero change. Any baseline supplied through the test
seam is INCOMPATIBLE and unused, even if it claims a matching version. Baseline
loading, approval, metric/schema fingerprints and comparison require a future
reviewed contract change. Never automatically adopt a run as the baseline.

| Status | Meaning / exit code |
| --- | --- |
| PASS | Reserved for complete collection without actionable findings and with an approved baseline. Not reachable in Stage 1 because baseline approval is outstanding. |
| ATTENTION | Safe completed collection with review observations, known implementation changes or absent/incompatible baseline. Exit 0. |
| BLOCKED | Unsafe path rejected, unreadable/malformed input, unverified Git, unknown dirty state, changed inputs, resource limit, unsupported CLI arguments, or verified required integrity failure. Exit 2. |
| CRITICAL STOP | Recognized sensitive material encountered. Abort and suppress collected metrics/findings. Exit 4. Any externally observed unexpected write, network access or prohibited execution must also stop the task immediately for human incident review. |

For collection exceptions, partial metrics are discarded. For verified integrity
failures in a stable, complete snapshot, metrics and proposed review actions remain
available under BLOCKED. Rejected paths are prevented reads, not claims of a leak.

Severity: INFO is contextual information; LOW is a review opportunity; MEDIUM is
planned investigation; HIGH is a verified integrity failure or potential serious
impact requiring human review; CRITICAL is a safety incident. Severity does not
grant authority. Action-required YES means a proposed human-reviewed follow-up,
never an action executed by the collector. All proposals here are Class A review;
any subsequent repair requires its own scope and approval.

Priority order: verified integrity failures, script-entry/registry inconsistencies,
image review, content review, SEO review, baseline approval, implementation Git
review. Counts support human prioritization; no speculative revenue score is used.
Existing fallback/reuse/script presence alone is not an incident or regression.

## Output safety and input consistency

The renderer emits reviewed fixed labels, enum strings and numeric aggregates.
It never interpolates product/blog values, image paths, URLs, script names, Git
path names or raw exception messages. Errors map to fixed messages. Known credential
patterns in selected fields and sensitive field names cause CRITICAL STOP.
Pattern detection is defense in depth, not a complete secret/PII classifier;
non-emission of raw input is the primary output control. Do not use this task as
a credential scanner or a certification that the repository contains no secrets.

All input paths reject traversal, UNC, backslashes, encoded paths, alternate
streams and symbolic links/junctions (including in ancestors and inside the root).
Remote HTTP(S) image references are counted only and never resolved or requested.
Text files use read-only descriptors, before/after identity metadata and SHA-256;
image references use identity/size/change-time metadata, including missing-file
state. Script directory membership is fingerprinted. Inputs are checked again
before any metrics are emitted. A changed fingerprint discards results without
retry or cleanup. Git fingerprints are also compared.

This is a trusted local, supervised reader, not an OS sandbox or atomic filesystem
snapshot. It does not claim protection against a hostile process racing directory
replacement between system calls, changes that occur after final verification,
or mutations to files outside the allowlist. It does not claim byte-level image
integrity from metadata. Avoid concurrent editing during a manual run. A detected
change blocks reporting; do not weaken checks to force completion.

Each Git invocation has a ten-second timeout and 1 MiB output cap. Collection checks
a sixty-second elapsed-time budget between filesystem operations, with no retries.
This is not a hard OS timeout for a stuck synchronous filesystem call. No lock file,
scheduled process, power setting or Windows configuration is created or changed.

## Prohibited operations and unavailable evidence

No repository/report/cache writes; no operational report persistence; no environment
file or process-environment-value reads; no credentials, `.vercel`, RFQ/customer
exports, attachments, import/crawl/cache payloads, pricing or supplier analysis.
No application module evaluation, other repository script imports, AUTO-001,
health wrappers, npm lifecycle commands, lint, build, validate or dev server.
No scraper, importer, expansion, image acquisition/mapping/generation, cleanup or
repair execution, including dry-run variants. No dependencies installed/upgraded.
No product/blog/image/RFQ mutation. No email, quotations, payments, customer or
supplier communications. No Git configuration writes, commit, push, publication,
deployment, production/Windows configuration or Task Scheduler operations.

Network and external-service permissions are NONE: Supabase, Resend, Search Console,
Analytics, Vercel, Cloudflare, social platforms and live website endpoints are never
accessed. Traffic, indexing, live availability, deployments, runtime errors,
database/RFQ activity and commercial results are explicitly NOT COLLECTED.

AUTO-001 remains independent and unchanged: no invocation, report ingestion,
schedule coupling or inference about its latest execution. Persistent history,
AUTO-001 report ingestion, notifications, scheduling and external-service adapters
require separate approval and implementation.

## Dedicated validation

```powershell
node --test tests/daily-operations-report.test.js
```

Tests import only the collector and Node built-ins. They use temporary synthetic
trees and an in-memory Git adapter; no real Git subprocess, application automation,
production data or network is used. Fixture cleanup validates its exact temporary
parent and generated prefix before removing only that fixture. Tests cover malformed
input, missing images, traversal/UNC/junctions, absent/incompatible baselines,
unsafe output, sensitive-marker stops, input and Git changes, and sanitized errors.

Implementation acceptance: review complete diff; run dedicated tests; confirm
catalog/blog/image hashes unchanged; perform the single authorized manual run;
check exit status; recheck unchanged data; run `git diff --check`; show Git status.
No generic lint/build/validation or AUTO-001 run is part of this acceptance.
