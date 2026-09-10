# GPLP-AUTO-002 — Daily Operations Report

## Stage 3 current implementation: local history and daily runner

The human's 2026-09-10 FAST TRACK request authorizes implementation and synthetic
testing of Class A AUTO-002 observation history, Previous comparison, a local
runner and a proposed operations queue. This section supersedes earlier statements
that history is deferred or unauthorized. It grants no scheduling, production,
external-service, repair, dependency, customer/commercial or Git publication rights.
The approved baseline artifact, revision and all 42 values are unchanged.

### Architecture and fixed boundaries

- `scripts/daily-operations-report.js`: version **3**, report schema **3**. Still
  reads only the existing repository allowlist, performs fixed read-only Git
  inspection and writes only stdout. Default output remains human-readable.
  The sole optional flag `--json` provides bounded structured transport to the
  runner; it accepts no input path and grants no writes or additional reads.
- `automation/run-daily-operations.js`: fixed Node executable
  `C:\Program Files\nodejs\node.exe`, fixed repository
  `C:\Projects\globalplcparts`, fixed collector path and `--json` argument.
  It invokes that collector once, shell-free, with an empty literal child
  environment, a 90-second child timeout and 64 KiB per output buffer. It captures
  the native exit code, suppresses raw stderr/exceptions, validates JSON and
  reconstructs report prose from reviewed constants and validated aggregates.
- `automation/auto002-history.js`: support module, not another executable task.
  It provides Previous selection, persistence classifications and history storage.
  Both support modules may import AUTO-002's pure validation/comparison functions;
  they do not import application modules or invoke another repository automation.
- The **only operational write root** is
  `C:\GlobalPLCParts-Automation\auto002-history`. No history, logs, queue file,
  lock file or temporary operational output is written in the repository.
  Temporary roots and injected child results exist only as imported synthetic
  test seams; neither CLI accepts alternate paths or commands.

The runner requires the approved external parent directory to exist. It may create
only the fixed history leaf and fresh run subdirectories. It does not create the
parent, change ACLs, repair prerequisites or alter Windows configuration. The fixed
Node installation path is a prerequisite, not an instruction to install Node.

### Immutable observations and safe publication

Each run uses a generated UUID-v4 subdirectory, claimed by exclusive nonrecursive
`mkdir`. The writer uses exclusive `wx` temporary files, bounded UTF-8 JSON/text,
flushes each file, and atomically renames within that private directory. It refuses
existing destinations and run-ID collisions. `report.txt` is published first;
`observation.json` is published **last** and is the successful observation commit
marker. Each file is at most 64 KiB. The stored text states that this final JSON
is the commit marker; only the runner's post-publication stdout claims WRITTEN.

Only complete, stable, clean MAIN results with a valid approved-baseline comparison,
exit 0 and no safety stop receive an observation JSON. ATTENTION is eligible.
BLOCKED, CRITICAL STOP, dirty, non-MAIN and baseline-unavailable runs can receive a
sanitized report only; they never become Previous. Child timeout, malformed transport
or exit mismatch is reported on stdout without persisting unverified child output.

Observations contain task/run IDs; UTC and offset-bearing local timestamps; fixed
repository scope; MAIN branch; current HEAD; CLEAN/0 Git evidence; schema/collector
3/3; `GPLP-AUTO-002-stage1-metrics-v1`; approved baseline ID/revision; all 42 metrics;
overall status; native collector exit; baseline and combined comparison summaries;
Previous run ID or null; and fixed safety declarations. No raw records, URLs,
environment values, customer/RFQ data, attachments or sensitive traces are stored.
The operations queue is included in each sanitized report, not a mutable work list.

No observation, report, baseline or existing run directory is overwritten or deleted.
There are no retries, cleanup, rotation or retention deletions. A crash may leave a
temporary file or report-only directory; these are not eligible observations and
are counted as gaps. Persistence failure preserves the verified **Current-only**
result, withholds uncertain Previous claims, reports FAILED, and exits 2 (4 for a
critical stop). It does not falsely report success or attempt remediation.

### Previous selection and compatibility

Only direct UUID-v4 directories under the fixed history root are inspected, and
only their fixed `observation.json` files are read. No arbitrary locations, paths,
latest pointers, recursive search, AUTO-001 reports or caller-supplied files are
accepted. Selection uses the newest **strictly earlier UTC timestamp** among valid
eligible records. Equal-timestamp competing latest records are ambiguous and
withhold history; future/equal-to-current observations are excluded and counted.

Validation rejects duplicate JSON keys, malformed or oversized data, unknown/missing
fields, incomplete metrics, invalid counts/rates, wrong scope/branch/Git evidence,
unsupported versions, wrong metric definition/baseline revision, invalid timestamp
associations, nonzero native exits, stops and inconsistent comparison summaries.
Malformed/incompatible records within the safe read bounds are skipped with an
aggregate gap count, never exposed verbatim. Oversized files, unsafe paths,
junctions/symlinks, hard-linked observation files, changing
files/directories or unreadable history withhold history and persistence entirely.
UNC paths and traversal are rejected. Ancestors are checked before access. Read
descriptors, metadata and SHA-256 content fingerprints are compared before/after
reading and again before publication; directory changes invalidate selection.

The scan is limited to 10,000 root entries and a 15-second checked history budget.
Reaching a limit is a visible history failure; it does not trigger rotation. No
eligible Previous is a normal first-run state and alone does not prevent PASS.
Skipped records remain visible, with a proposed repository/history review action.

Only history schema/collector **3/3** is supported. Older report versions are not
silently adopted as history. The approved baseline retains original **1/1** evidence;
the explicit baseline **1/1 → current 3/3** mapping is valid because all 42 collection
definitions, units and thresholds remain unchanged. Baseline approval never advances
from Previous, a successful run, reduced warnings or a new HEAD. Historical source
commit and current HEAD may differ; current HEAD changes during collection still block.

### Comparison, persistence and operations queue

Report columns: Metric, Unit, Current, Previous, Approved Baseline, Delta vs Previous,
Delta vs Baseline, Classification, Persistence. Both deltas use signed count changes
or percentage points. Each rate direction uses integer numerator/denominator
cross-products; below-display-precision changes remain flagged. Missing comparators
remain N/A. Baseline comparison and Previous comparison both contribute to status.

Persistence describes the baseline-relative finding across the two observations:

| State | Meaning |
| --- | --- |
| NOT COMPARABLE | No valid Previous/baseline or current observation is ineligible |
| NEW | Current needs baseline-relative review and Previous did not, or a new Previous-relative increase needs review even below the approved baseline |
| PERSISTENT | Both need baseline-relative review, without further divergence |
| REGRESSED FURTHER | Proxy/advisory count or rate rises again, or inventory/marker absolute distance from baseline grows; this is an observation, not verified harm |
| RESOLVED | A prior baseline-relative finding is no longer present; inventory reversal can still require review against Previous |
| PROXY REDUCTION | A quality proxy decreased against Previous; takes precedence over RESOLVED and never claims verified quality improvement |
| UNCHANGED | Neither observation has an active baseline-relative finding, no Previous-relative alert and no proxy reduction applies |

The blocking/advisory/proxy/inventory/script/SEO policies remain as documented below.
An unchanged proxy above the approved baseline is PERSISTENT; an unchanged explicitly
accepted baseline proxy does not become a new incident. Existing approved inventory
and proxy values stay visible. PASS/ATTENTION exit 0, BLOCKED exit 2, CRITICAL STOP
exit 4. Runner persistence failure is separately exit 2 while the native collector
exit and Current status remain visible; neither is relabeled to imply collection failed.

The local queue groups affected metrics into repository, scripts, images, content
and SEO review. Blocking integrity and repository/history problems receive priority
1; other changes receive priority 2. Every item is a fixed-text **human review
proposal**, never an executed action. Accepted unchanged observations create no
new queue incident. Source markers and quality proxies do not prove runtime health,
image relevance, licensing, indexing, content accuracy or live business performance.

### Acceptance, scheduling preparation and limits

Only dedicated AUTO-002 synthetic tests are authorized in this implementation turn:
`node --test tests/daily-operations-report.test.js`. No real repository collection,
external history creation or real runner execution is performed during development.
Human review and human-controlled commit/clean-tree preparation must precede a
separately authorized acceptance run under the repository-owning Windows account.
The future manual entry point is the fixed Node executable followed by
`C:\Projects\globalplcparts\automation\run-daily-operations.js`, with no arguments.

Later scheduling must be separately approved. Prepared runner requirements are:
repository-owning account, limited privilege, existing Node/parent path, one instance,
no retries and an outer scheduler timeout (suggested 3 minutes). No scheduler task,
Windows setting, power policy, credentials or Git trust exception is changed now.
AUTO-001 remains independent and untouched.

This is trusted local reporting, not a security boundary against hostile processes.
Exclusive run namespaces prevent cooperative writer collisions; prechecks cannot
prevent a hostile directory swap between filesystem calls. History has no external
signature/authenticity authority; valid historical data must be protected from manual
or hostile edits by existing local access controls. Atomic rename provides visibility,
not a guarantee against power-loss/filesystem failure. The history budget is checked
between synchronous calls; it is not a hard timeout for a stuck filesystem. The child
collector has the hard runner timeout; a later outer scheduler timeout is still needed.
No ACL/configuration changes are authorized to address these limits automatically.

## Stage 2 reference implementation contract (historical)

Stage 2 minimal baseline comparison was explicitly authorized by the human on
2026-09-09. It implements **Current vs Approved Baseline only**, Class A, local-only,
manual-only and stdout-only. Previous always displays
`NOT AVAILABLE — HISTORY DEFERRED`; Previous and Delta vs Previous cells display
`N/A / HISTORY DEFERRED`. No operational history or scheduler is created.

This section governs the current implementation. The Stage 1 reference below
preserves historical behavior and the original human baseline approval/evidence;
its statements about comparison being unimplemented describe that earlier stage.
The baseline approval and all 42 approved values remain unchanged.

### Fixed baseline artifact and approval boundary

Only this additional repository input may be read:

`automation/baselines/GPLP-AUTO-002-baseline-v1-revision-2.json`

The artifact is the exact transcription of the approved metric table below, with
baseline format 1, task GPLP-AUTO-002, baseline ID GPLP-AUTO-002-baseline-v1,
revision 2, APPROVED / ACTIVE INITIAL BASELINE, evidence timestamp
2026-09-07T07:27:51.184Z, source commit
ee6582e77001d2b9f09134e06a94c13a543f46e7, schema/collector 1/1, CLEAN/0/MAIN,
native exit 0 and metric definition ID `GPLP-AUTO-002-stage1-metrics-v1`.

The collector opens this exact file as UTF-8 data, never as a module. It does not
scan the baseline directory, discover a latest file, accept a baseline CLI path,
or create/replace any artifact. Runtime remains write-free. Artifact creation is
an explicitly authorized implementation change, not an automatic baseline update.

The file is capped at 64 KiB. Validation rejects malformed JSON, duplicate keys
(including escaped/nested duplicates), excessive nesting, unexpected/missing
metadata or metrics, nonnumeric/nonfinite/negative/fractional counts, invalid
percentage/marker ranges, inconsistent rate values, wrong identity/revision/
approval/source commit/timestamp/definition ID and invalid Git/native-exit evidence.
The reviewed canonical-content SHA-256 is pinned in the collector:

`aa98cce84169c6ff12207246214e4c56a384422f27579c520d750d8586c104f9`

Canonicalization recursively sorts object keys and uses JSON primitive encoding;
formatting and key order do not change the approved values. This digest detects
altered approved content, but is not an OS security boundary or an independent
approval authority. The file receives the same ancestor/symlink/path checks and
before/after fingerprint verification as other inputs. It is never writable by
the collector. Future revisions still need separate explicit human approval.

### Versions and compatibility

Current report schema: **2**. Current collector version: **2**.
Baseline evidence remains schema **1**, collector **1**; it is not relabeled.
The sole authorized compatibility mapping is evidence schema/collector **1/1**
to report/collector **2/2**, using `GPLP-AUTO-002-stage1-metrics-v1`.
All 42 collection calculations, grouping rules, thresholds and units are unchanged.
Comparison classifications and report layout are new behavior, hence version 2.

Positive integer but unsupported evidence schema/collector versions are rejected
for comparison as INCOMPATIBLE / ATTENTION; no deltas are computed from them.
Malformed version fields are BLOCKED. No generic version fallback or migration
exists. Missing baseline means NOT AVAILABLE / ATTENTION, with current integrity
checks still enforced. A malformed or altered baseline is BLOCKED, not a substitute
zero baseline. The approved historical source commit need not equal current HEAD;
a change to current HEAD during collection remains BLOCKED.

### Comparison and status semantics

Each of the exact 42 keys appears in one policy class. Blocking integrity contains
the eight zero-required metrics listed below. Advisory integrity contains the
three consistency/completeness counts. Quality proxies contain duplicate-description,
duplicate-title, short-description and image-count/rate metrics; distinctBlogDates
is a separate date proxy. Inventory, script inventory and SEO markers remain
separate policy classes. No metric is newly classified as an integrity failure.

| Condition | Result |
| --- | --- |
| Blocking integrity count above zero; products or blogs zero | BLOCKED, regardless of baseline availability |
| Advisory integrity or quality proxy increase | ATTENTION, human review only |
| Advisory decrease | PASS row, advisory count reduction |
| Quality proxy decrease | PASS row, PROXY REDUCTION ONLY; no verified-quality claim |
| Equal approved value | PASS row, ACCEPTED OBSERVATION / UNCHANGED; no new incident |
| Inventory, script inventory, distinct blog dates or SEO marker change in either direction | ATTENTION |
| Complete stable clean MAIN observation, compatible baseline, no attention/blocking rows | PASS overall |
| Known reviewed Stage 1 implementation-path changes | ATTENTION; not clean-tree baseline eligible |
| Unknown dirty paths, including an untracked/modified baseline artifact | BLOCKED; no cleanup or allowlist expansion |
| Stable non-MAIN or detached HEAD | ATTENTION; MAIN comparison withheld, current integrity checks retained |
| Branch/HEAD or input changes during collection | BLOCKED; discard partial metrics/comparisons; no retry |
| Secret marker / sensitive-data stop | CRITICAL STOP; suppress partial metrics/comparisons |

Overall precedence is CRITICAL STOP > BLOCKED > ATTENTION > PASS.
Native exits: PASS 0, ATTENTION 0, BLOCKED 2, CRITICAL STOP 4.
Proxy changes alone never cause BLOCKED. Invalid evidence structure/ranges are
validation failures, not proxy regressions. Existing approved nonzero values remain
visible without repeated action-required findings. Only changed/blocked rows and
baseline/Git review conditions produce proposed human actions.

Rows contain Metric, Unit, Current, Previous, Approved Baseline, Delta vs Previous,
Delta vs Baseline and Classification. Counts use signed subtraction; rate metrics
use percentage-point deltas rounded to two decimals. Direction of rate changes
uses exact integer cross-products of numerators and product denominators. A rate
change below display precision is explicitly flagged even if displayed delta is
zero. Absolute count increases remain independently visible. No relative percent
change is substituted. A zero denominator with an empty catalog yields BLOCKED.

### Execution, validation and remaining limits

The entry point remains `node scripts/daily-operations-report.js`, without arguments.
It is **not executed as part of implementation acceptance**. The real acceptance
run requires separate authorization and the repository-owning Windows account,
with native exit-code forwarding. No Git ownership exception is added. The fixed
Git commands and literal child environment remain unchanged.

Only `node --test tests/daily-operations-report.test.js` is run for implementation
validation. Tests use temporary synthetic trees, mock Git observations and pure
metric comparisons. Synthetic Node subprocesses test native exit mapping by module
import only, without collecting repository data or invoking Git. Tests also compare
the baseline artifact to all 42 documented approved values. They do not call
AUTO-001, lint, build, validate or any high-risk script.

Only the collector, its dedicated tests and this contract are modified; only the
fixed JSON artifact is created. No dependencies, application/business data, AUTO-001,
Git/Windows configuration or scheduler are changed. No external service, secrets,
credentials, customer/RFQ data, quotations, payments or supplier actions are permitted.
No automatic repair, baseline advancement, history, commit, push or deployment.

The original filesystem race/resource limitations below remain applicable. Static
markers and image metadata do not prove live-site behavior, image relevance or
licensing. A separately authorized clean-tree manual run remains required before
operational acceptance; passing synthetic tests does not establish live readiness.

## Stage 1 reference (historical behavior and approved baseline evidence)

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

The initial baseline is explicitly human approved in the approval record below.
The unchanged Stage 1 collector does not load this documentation baseline:
every CLI run still reports **NOT ESTABLISHED** and trends **NOT AVAILABLE**,
not zero change. Any baseline supplied through the test
seam is INCOMPATIBLE and unused, even if it claims a matching version. Baseline
loading, approval, metric/schema fingerprints and comparison require a future
reviewed contract change. Never automatically adopt a run as the baseline.

| Status | Meaning / exit code |
| --- | --- |
| PASS | Reserved for complete collection without actionable findings and with an approved baseline. Not reachable in the unchanged Stage 1 collector because baseline loading/comparison is not implemented or authorized. |
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

## Approved v1 initial baseline and proposed comparison design

This section records the explicitly human-approved initial baseline in documentation
only. It does not implement baseline loading, comparison, operational history or
scheduling. The current collector still reports NOT ESTABLISHED and cannot emit
PASS. Future comparison behavior below remains a proposal requiring separate
implementation authorization and review.

### Evidence and candidate identity

Baseline ID: `GPLP-AUTO-002-baseline-v1`, revision 2,
status **APPROVED / ACTIVE INITIAL BASELINE**.
Revision 2 populates the prior revision 1 metric placeholders from the fresh
human-supplied run; no comparison policy or collector behavior has changed.
Target task: GPLP-AUTO-002; report schema: 1; collector version: 1;
comparison policy proposed here: 1. Baseline revision is independent of collector
and report-schema versions.

### Explicit human approval record

- Approver: the human user, by explicit approval in this conversation.
- Approval date: 2026-09-07 (session date; exact approval time was not supplied).
- Approved baseline: `GPLP-AUTO-002-baseline-v1`, revision 2.
- Evidence source commit: `ee6582e77001d2b9f09134e06a94c13a543f46e7`.
- Approved schema / collector versions: 1 / 1.
- Scope: the complete existing 42-metric set, evidence identity, clean-tree
  eligibility, run timestamp and native Node exit 0 were human reviewed and
  accepted as the initial Stage 1 baseline. All metric values remain unchanged.
- Authority: explicit human approval, **not automatic baseline advancement**.

ACTIVE INITIAL BASELINE identifies the approved reference in this document; it
does not mean that the collector has started loading or comparing it. The original
run's NOT ESTABLISHED output remains unchanged below as historical evidence.

This approval grants no additional autonomy. It does not authorize automatic
baseline replacement, automatic repairs, production changes, AUTO-002 scheduling,
history/comparison implementation, AUTO-001 execution, external-service access,
or access to secrets, credentials, customer data, RFQs, quotations, payments or
supplier actions. Future baseline revisions require separate explicit human
approval. No run, commit or push is authorized by this approval record.

Evidence identity: `GPLP-AUTO-002 / 2026-09-07T07:27:51.184Z / schema 1 / collector 1`.
Source: human-supplied clean-tree manual run, not a collection performed by Codex.

| Evidence field | Supplied value |
| --- | --- |
| Task ID | GPLP-AUTO-002 |
| Stage | 1 / MANUAL ONLY / Class A / STDOUT ONLY |
| Status | ATTENTION |
| Coverage | COMPLETE WITHIN STAGE 1 |
| Baseline | NOT ESTABLISHED |
| Schema / collector version | 1 / 1 |
| Timestamp UTC | 2026-09-07T07:27:51.184Z |
| Git state / changed paths / branch class | CLEAN / 0 / MAIN |
| Native Node exit code | 0 (human verified from retained output of this exact run) |
| Automatic actions | observation and reporting only |
| Automatic repairs | NONE |
| Repository writes | NONE |
| Production changes | NONE |
| External services accessed | NONE |
| Scheduler changes | NONE |
| Environment/credential/customer stores accessed | NONE |

Current source commit observed before this documentation edit using
`git --no-optional-locks rev-parse --verify HEAD`:
`ee6582e77001d2b9f09134e06a94c13a543f46e7`.
The human has now explicitly confirmed that the repository-owning Windows account
returned this same commit from `git rev-parse HEAD`, and associates it with the
verified clean-tree candidate run at `2026-09-07T07:27:51.184Z`. The same retained
PowerShell session shows `Native Node exit code: 0`. The run-to-commit association
is therefore human verified, not inferred from the later local HEAD observation.
This completed evidence association for `GPLP-AUTO-002-baseline-v1` revision 2.
The association itself did not grant approval; the subsequent explicit human
approval is recorded separately above.

Additional human-verified evidence for this exact run records native Node exit 0.
The human retained the PowerShell output from the same manual collection and
verified the following capture and output (documented here, not executed by Codex):

```powershell
$auto002NativeExitCode = $LASTEXITCODE
Write-Output "Native Node exit code: $auto002NativeExitCode"
```

Retained result: `Native Node exit code: 0`. This evidence belongs to the candidate
run at `2026-09-07T07:27:51.184Z`, not an earlier run. Candidate revision remains 2.

The earlier CodexSandboxOffline ownership rejection is a separate execution-context
failure, not a catalog regression or collector defect. No trust exception is authorized.
All metric values below are transcribed exactly from this fresh human-supplied
evidence, without normalization, recalculation, inference or older audit substitutes.
No new run is authorized by this preparation document.

### Exact v1 metric set

Every current Stage 1 numeric metric is versioned below, with Git state recorded
as eligibility metadata. Counts are nonnegative integers; percentages are numeric
values from 0 to 100. All 42 numeric metrics are populated; no metric is PENDING.
Candidate values in each row correspond to the metric keys in the same order.

| Group | Exact metric keys | Candidate values |
| --- | --- | --- |
| Integrity: blocking | `missingProductFields`, `duplicateProductSlugGroups` | 0, 0 (human verified) |
| Integrity: blocking | `missingImageRecords`, `missingLocalImageRecords`, `missingBlogFields`, `duplicateBlogSlugGroups`, `invalidBlogDates`, `missingPublicRoutes` | 0, 0, 0, 0, 0, 0 |
| Integrity: advisory consistency | `missingBrandSlug`, `missingDescriptions`, `inconsistentBrandSlugGroups` | 0, 0, 0 |
| Quality proxies | `duplicateDescriptionGroups`, `duplicateBlogTitleGroups`, `distinctBlogDates`, `shortBlogDescriptionsUnder200Characters` | 1, 0, 2, 300 |
| Quality proxies: images | `remoteImageRecords`, `svgImageRecords`, `svgImagePercent`, `heavilyReusedImagePaths`, `productsOnHeavilyReusedPaths`, `heavyReuseProductPercent`, `maximumImageReuse` | 0, 72, 1.36, 36, 2818, 53.29, 611 |
| Inventory: catalog | `products`, `brands`, `categories` | 5288, 17, 5 (human verified) |
| Inventory: content/images | `blogs`, `blogCategories`, `uniqueImagePaths` | 300, 18, 1571 |
| Inventory: scripts | `scriptFiles`, `filenameRiskHeuristic`, `registryHighRiskScripts`, `scriptsWithoutRegistryRows`, `missingDirectNodeEntryPoints`, `checkImagesKeyOccurrences` | 47, 37, 41, 2, 1, 2 |
| SEO source markers: detail pages | `detailPagesWithMetadataMarker`, `detailPagesWithCanonicalMarker`, `detailPagesWithStructuredDataMarker` | 3, 3, 3 |
| SEO source markers: flags | `layoutMetadataMarker`, `sitemapCatalogMarker`, `sitemapBlogMarker`, `sitemapCurrentDateMarker`, `robotsSitemapMarker` | 1, 1, 1, 1, 1 |

Inventory counts `products` and `blogs` also have the existing hard integrity
requirement of being greater than zero. Inventory classification does not override
that requirement. Nonzero missing-entry-point or registry-gap counts are review
findings, not proof that a dangerous script executed.

Baseline eligibility requirements: repository `C:\Projects\globalplcparts`, Git CLEAN,
changedPaths 0, branch class MAIN, complete stable collection, native exit 0 and
no safety stop. An ATTENTION run may be a baseline candidate: the human must
explicitly acknowledge the listed nonblocking observations. Acceptance must never
normalize a blocking integrity failure or safety violation.

### Percentages and units

Keep both numerator and denominator; never replace counts with percentages.
Existing collector values are:

- `svgImagePercent = 100 * svgImageRecords / products`.
- `heavyReuseProductPercent = 100 * productsOnHeavilyReusedPaths / products`.

Both are rounded to two decimals as in collector v1. Future comparison may display
derived short-description and remote-image percentages using blogs and products,
respectively, but they are display-only calculations, not additional v1 collector
metric keys. Duplicate-description groups are groups, not affected-product counts;
do not report their ratio to products as an affected-product percentage.
Heavy reuse remains at least 20 products per path; short description remains under
200 trimmed characters. Whitespace/case/grouping semantics remain those in v1.
Use unrounded count ratios to decide whether a rate increased; rounded display
must not hide small changes. Zero denominators yield N/A for comparison and the
existing empty-catalog/blog BLOCKED result, regardless of the collector's numeric
zero percentage fallback.

### Proposed comparison and status policy

Precedence: CRITICAL STOP overrides BLOCKED, which overrides ATTENTION, then PASS.
Status describes the local report only, never production availability or SEO success.

| Condition | Proposed outcome |
| --- | --- |
| Any existing blocking integrity metric above zero; products or blogs zero | BLOCKED, even if a baseline recorded the same value; cannot be accepted as normal |
| Unreadable/malformed required input, rejected path, changed inputs, Git execution/ownership/identity failure, unknown dirty paths | BLOCKED; retain existing fail-closed behavior |
| Known reviewed implementation dirty paths | ATTENTION; never eligible as a new clean-tree baseline; do not expand the current dirty-path allowlist |
| Valid baseline absent, incompatible or awaiting approval | ATTENTION, comparison unavailable; no PASS claim |
| Advisory integrity count increases against previous or approved baseline | ATTENTION; unchanged/decreased counts are accepted only when acknowledged in the baseline |
| SVG/reuse/remote/short-description/duplicate-description/duplicate-title count or applicable rate increases against either comparator | ATTENTION for review only; never BLOCKED from a quality proxy alone |
| Quality-proxy counts and rates unchanged or decreased | No new alert when the approved baseline acknowledges them; decreases are observations, not verified quality improvements |
| Distinct blog dates change in either direction | ATTENTION to review date provenance; neither direction proves freshness |
| Any inventory metric changes against either comparator | ATTENTION, including decreases; catalog growth is a review observation, not an incident or automatic failure |
| Any SEO source-marker count/flag changes in either direction | ATTENTION; marker presence/removal alone cannot establish runtime correctness/failure |
| Stable complete clean MAIN run, approved compatible baseline, no new alerts, acknowledged baseline observations only | PASS; show accepted observations and remaining human backlog without escalating their unchanged presence |

These initial thresholds intentionally use any increase/change, not an invented
materiality allowance. They are proposals requiring approval. Counts and rates are
evaluated independently: a lower percentage does not cancel a higher count.
Do not introduce generic "nonzero means FAIL" rules for quality, inventory or SEO.
An already nonzero advisory/proxy value is acknowledged only through explicit
baseline approval; unchanged values in an unapproved draft remain review items.

Action-required is separate from status: YES requests a new human-reviewed
investigation or approval; accepted unchanged observations can be INFO with
action-required NO while a previously acknowledged backlog remains visible.
Severity and autonomy stay separate. Nothing in a comparison authorizes a repair.

### Current / Previous / Approved Baseline / Delta

Future report columns:

```text
Metric | Unit | Current | Previous | Approved Baseline | Delta vs Previous | Delta vs Baseline | Status
```

Current is the safely completed current snapshot. Previous is the most recent
earlier comparable, complete, clean MAIN run with exit 0, if a future approved
history mechanism provides it. Failed/partial/dirty runs are not previous values;
show any known intervening gaps/failures separately rather than hiding them.
Approved Baseline is the immutable explicitly named approved revision, never
"latest report" or "previous run". Label all source timestamps and version IDs.

Delta counts are signed `Current - comparator`; percentage deltas are percentage
points. Optional relative changes are N/A when the comparator is zero. Unknown,
absent or incompatible comparators display N/A with a reason; never zero-fill.
Previous unavailable alone need not prevent PASS if the approved-baseline
comparison is complete; clearly mark history coverage unavailable. Without any
approved baseline, overall status remains ATTENTION. No history exists in Stage 1.

Compatibility requires the exact task ID, repository scope, report schema,
collector version, metric-key set, types, units, grouping/threshold definitions
and comparison-policy version. The supplied run confirms schema 1 / collector 1.
A future comparator
implementation must be versioned honestly; if it changes the collector version,
v1 observations are not silently relabeled compatible. Revalidation and explicit
human approval of the new candidate/version mapping are required. No automatic
migration, fallback to AUTO-001 or baseline replacement is allowed.

### Explicit human approval and replacement

1. Supply all metrics from the same verified clean-tree report and
   record its timestamp, commit identity and verified versions. Revision 2 has all
   metrics, timestamp, versions, human-verified native exit 0 and explicit human
   confirmation associating the run with the recorded source commit.
   Preserve only
   sanitized aggregates and identifiers, never raw records, secrets or URLs.
2. Present a frozen candidate revision with the exact metric table, source evidence,
   metric definitions, comparison policy and acknowledged nonblocking findings.
   Include a content digest of that exact candidate when an approval artifact is
   separately authorized. Do not create operational history to perform this step.
3. Obtain an explicit human statement naming the candidate ID, revision, evidence
   identity/digest and policy version, for example: "I approve GPLP-AUTO-002-baseline-v1
   revision [N], evidence [ID/digest], schema [S], collector [C], comparison policy 1,
   with the listed values and acknowledged nonblocking observations."
4. Record approver and approval time only after that statement. General approval
   of Stage 1, this design, a successful run or a commit does not approve a baseline.
   Authorization to persist/load a baseline or implement comparison must be explicit
   and scoped separately; approval never enables scheduling, history or repairs.
5. Never mutate an approved baseline. Any new proposal gets a new revision/version,
   a diff against the prior approved baseline, rationale and complete evidence.
   Explicit human approval is required to select it as active. Retain the old
   approval record; never advance from a schedule, moving average, decreased warning
   count, latest run or inferred human silence.

Approval status: `GPLP-AUTO-002-baseline-v1` revision 2 is
**APPROVED / ACTIVE INITIAL BASELINE** by explicit human approval. The complete
42-metric set and its evidence are accepted without changing any values.
Baseline identity and revision are unchanged. Nonblocking observations remain
observations; acceptance does not authorize their repair. Runtime baseline
loading/comparison, history and scheduling remain unimplemented and unauthorized.
