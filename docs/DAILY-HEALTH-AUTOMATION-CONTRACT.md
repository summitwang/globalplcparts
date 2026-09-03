# GlobalPLCParts Daily Health Automation Contract

## 1. Task identity

| Field | Contract value |
|---|---|
| Task ID | `GPLP-AUTO-001` |
| Task name | Daily Repository Health Check |
| Autonomy class | Class A — Automatic Read-Only |
| Current rollout stage | Stage 1 / Pre-scheduling approval |
| Future frequency | Daily |
| Command | `npm.cmd run health-check` |
| Repository working directory | `C:\Projects\globalplcparts` |
| Production permission | **NONE** |
| External service permission | **NONE** |
| Business-data permission | **NONE** |
| Mutation permission | **NONE** |

This contract defines the task but does not enable or schedule it. `AGENTS.md` and the repository guardrail, test/preview, scripts registry, and autonomous workflow documents remain authoritative.

## 2. Purpose

`GPLP-AUTO-001` exists to detect repository integrity drift without repairing findings or changing the repository, production systems, or external services. The approved health-check may inspect:

- Product catalog parsing, required fields, counts, brands, and duplicate slugs
- Missing referenced local product-image files
- Remote product-image URLs
- Fallback/SVG image usage and heavily reused image paths
- Blog source integrity, counts, and duplicate slugs
- Public and dynamic route structure
- Sitemap, robots, and other SEO handler structure
- RFQ route-file structure only, without invoking routes or reading RFQ records
- Expected environment-variable names only, never values
- Presence of high-risk script families, without importing or executing them
- Unexpected Git working-tree changes, without cleaning or modifying them

The task must never repair, download, replace, generate, map, import, delete, reset, commit, deploy, or communicate in response to a finding.

## 3. Expected baseline

The currently approved baseline is:

- **16 PASS**
- **3 WARN**
- **0 FAIL**

Known warning categories and observed values are:

1. 72 products using fallback or SVG image paths
2. 36 image paths referenced heavily according to the health-check threshold
3. 37 high-risk script files present but not executed

Git working-tree changes during active, reviewed development may still produce a warning, but that conditional warning is not part of the approved clean-tree baseline. A dirty tree during unattended execution remains an ATTENTION condition.

These are observations, not automatic incidents.

| Result | Meaning |
|---|---|
| **EXPECTED WARN** | An approved warning category remains at or below its accepted baseline or is explained by known supervised development |
| **NEW WARN** | A new category appears, an unattended run sees a dirty tree, or an approved count crosses its proposed threshold |
| **FAIL** | A health-check integrity check fails or the command exits non-zero |
| **CRITICAL STOP** | Secret/customer data appears, read-only behavior is violated, an external service is contacted, destructive behavior occurs, or a high-risk script executes |

## 4. Result classification

### HEALTHY

- Zero FAIL results
- Only approved baseline warnings within approved thresholds
- No unexpected repository write
- No secret or sensitive-data exposure

### ATTENTION

- Zero FAIL results, but a new warning appears
- A warning count materially changes
- Fallback or reuse counts exceed the approved attention threshold
- An unattended run encounters a dirty Git state or unexpected untracked file

### BLOCKED

- One or more FAIL results
- Health-check exits non-zero or times out
- Repository identity or state cannot be inspected safely
- Required source/data files cannot be parsed
- A prerequisite is missing and cannot be repaired within this read-only contract

### CRITICAL STOP

- A secret value, credential, authorization header, or signed URL appears
- Customer, RFQ, quotation, supplier, pricing, or other business data appears unexpectedly
- The supposedly read-only execution writes an unexpected file or record
- A production or external service is unexpectedly contacted
- Destructive behavior is detected
- A high-risk script is unexpectedly imported or executed

A CRITICAL STOP suspends further autonomous work until the user reviews the incident.

## 5. Proposed warning thresholds

These are conservative initial proposals and require explicit approval before scheduling.

| Metric | Baseline | Expected | ATTENTION | HIGH / approval review |
|---|---:|---|---|---|
| Fallback/SVG product count | 72 | Unchanged or decreased | Increase of 1–5 | Increase of more than 5 |
| Heavily reused image-path count | 36 | Unchanged or decreased | Increase of 1–3 | Increase of more than 3 |
| High-risk script count | 37 | Unchanged | Any increase | New script with unknown/destructive behavior or registry mismatch |
| FAIL count | 0 | Zero | Not applicable | Any FAIL is **BLOCKED** |
| Secret/customer-data occurrence | 0 | Zero | Not applicable | Any occurrence is **CRITICAL STOP** |

Ordinary catalog growth is not an incident by itself. Threshold comparison must use the health-check's metric definitions consistently; changes caused by an approved health-check version require a new reviewed baseline.

## 6. Git state policy

- **Clean tree:** normal and preferred for unattended execution.
- **Dirty tree during known supervised development:** EXPECTED WARN when the changed paths are understood and reported.
- **Dirty tree during unattended scheduled execution:** ATTENTION.
- **Unexpected untracked files:** ATTENTION and review.
- Unexpected changes involving `.env*`, `data/products.json`, RFQ/customer-data locations, production configuration, or deployment configuration require escalation. A secret or customer-data exposure is a CRITICAL STOP.

The task must never clean, restore, checkout, stash, reset, stage, commit, move, or delete Git changes. It must not infer that a dirty tree is disposable.

## 7. Execution safety

### Before execution

The future runner must:

1. Verify the exact working directory is `C:\Projects\globalplcparts`.
2. Verify that the directory is a Git repository.
3. Verify that `package.json` exists.
4. Verify that `scripts/health-check.js` exists.
5. Verify that no other instance of `GPLP-AUTO-001` is running.
6. Avoid reading `.env.local` or any environment-variable value.

It must not pull Git changes, install dependencies, upgrade packages, repair Node/npm, change configuration, or create missing repository files.

### During execution

Run only:

```text
npm.cmd run health-check
```

Do not accept command-line input that changes the command. Do not chain arbitrary commands, invoke application routes, access the network, or run any scraper/importer/generator/image/catalog mutation script.

### After execution

- Capture exit status and sanitized stdout/stderr for classification.
- Do not modify repository state.
- Do not repair findings.
- Do not automatically commit, push, deploy, notify external services, or retry.
- If repository state changed unexpectedly, classify CRITICAL STOP and preserve evidence without exposing sensitive content.

## 8. Timeout policy

Proposed timeout: **5 minutes**.

If the timeout expires:

- Terminate only the health-check process and its known child process if this can be done safely.
- Classify the run as **BLOCKED**.
- Record that a timeout occurred.
- Do not repair Node/npm or repeatedly retry.
- Leave repository and external systems unchanged.

No run may wait indefinitely.

## 9. Retry policy

Proposed automatic retries: **0**.

A failed read-only integrity check should remain visible for review rather than be obscured by repeated executions. A future retry policy requires separate approval and must remain bounded.

## 10. Reporting contract

```text
GlobalPLCParts Daily Health

Date/Time:
Task ID: GPLP-AUTO-001

Status: HEALTHY | ATTENTION | BLOCKED | CRITICAL STOP

Health Check:
PASS:
WARN:
FAIL:

Baseline: 16 PASS / 3 WARN / 0 FAIL

Changes from baseline:
...

Git state: CLEAN | DIRTY | UNKNOWN

Important findings:
...

Automatic repairs: NONE
Production changes: NONE
External side effects: NONE

Approval required: YES | NO
```

Reports must not contain environment-variable values, credentials, customer/RFQ/supplier details, signed URLs, quotation data, or other sensitive business information.

## 11. Report storage and retention

Proposed future report directory:

```text
C:\GlobalPLCParts-Automation\reports\
```

This location is outside the Git repository so report creation does not dirty the working tree. It is not created by this contract. Before use, its ownership, access permissions, disk capacity, and backup behavior must be reviewed.

Recommended formats are UTF-8 plain text or structured JSON with a stable schema. Filenames should contain the task ID and an unambiguous local or UTC timestamp. Reports must be sanitized before writing.

Proposed retention: **30 days of daily reports**.

`GPLP-AUTO-001` must not delete reports. Any future retention cleanup is a separate, explicitly approved write task with exact path validation and recovery considerations.

## 12. Notification policy

No notification integration is enabled by this contract.

| Status | Proposed behavior |
|---|---|
| HEALTHY | Store the report; no urgent notification |
| ATTENTION | Include in the next daily operating summary |
| BLOCKED | Notify the user through a separately approved mechanism |
| CRITICAL STOP | Notify the user immediately through a separately approved mechanism and suspend autonomous work |

Do not configure or send email, WhatsApp, Telegram, Slack, SMS, or other external notification in this task. Notification channels, recipients, credentials, redaction, and delivery failures require a separate contract.

## 13. Future scheduler requirements

An approved scheduler must:

- Run once daily from the exact repository directory.
- Run under a named, known Windows user without administrator privileges.
- Prevent overlapping instances.
- Use the approved five-minute timeout.
- Capture and sanitize stdout/stderr safely.
- Avoid exposing secrets in commands, arguments, logs, or reports.
- Avoid waking, deploying, or altering production systems.
- Perform no automatic Git pull, npm install, repair, commit, push, or deployment.
- Run only the contracted health-check command.
- Record skipped runs or machine-offline conditions without unsafe catch-up loops.

### Scheduler comparison

| Option | Fit for this repository | Risks and prerequisites |
|---|---|---|
| Windows Task Scheduler | Best initial fit for a dedicated local Windows repository; native, local, and capable of fixed working directory/user/overlap controls | Requires careful non-admin task configuration, timeout/output wrapper design, machine availability, and explicit approval |
| ChatGPT/Codex-supported scheduling | Potentially useful if a supported scheduler is available and can operate on this exact local repository with the contract's permissions | Availability and local-filesystem execution are not established by repository or current environment evidence; do not assume or enable it |
| GitHub Actions | Strong centralized scheduling and logs, but not an initial fit for this dedicated local checkout | Runs on a separate runner/checkout, adds external infrastructure and repository publication concerns, and requires reviewed secrets/network/artifact policies |

**Proposed scheduler:** Windows Task Scheduler, using a separately reviewed minimal local runner solely to enforce the working directory, timeout, non-overlap, and external report capture. No runner or task is created here.

Official OpenAI materials describe ChatGPT and Codex automation use cases, but they do not prove that this particular local environment has a scheduler capable of running this contract. That option remains unverified.

## 14. Fail-safe behavior

If anything unexpected happens, stop. Never automatically:

- Reset, stash, restore, commit, delete, or clean Git changes
- Repair or alter production
- Rotate credentials or weaken security
- Execute a high-risk script
- Contact customers or suppliers
- Send an RFQ or quotation
- Change pricing or commercial terms
- Deploy, roll back, push, or publish changes

## 15. Enablement approval checklist

Every item must be explicitly approved before `GPLP-AUTO-001` is enabled:

- [ ] Task contract approved
- [ ] Daily frequency approved
- [ ] Scheduler approved
- [ ] Execution time approved
- [ ] Working directory approved
- [ ] Timeout approved
- [ ] Warning thresholds approved
- [ ] Report location approved
- [ ] Report retention approved
- [ ] Notification behavior approved
- [ ] No-production permission confirmed
- [ ] No-business-data permission confirmed
- [ ] No-auto-repair policy confirmed

## 16. Final recommendation

**READY FOR SCHEDULER IMPLEMENTATION — NOT YET ENABLED**

The existing health-check is deterministic, read-only, exits successfully with warnings, and currently reports 16 PASS / 3 WARN / 0 FAIL. Scheduler implementation must wait until the approval checklist is complete and must be reviewed as a separate task.

Proposed execution schedule: **Daily at 3:00 AM Windows local time**.

- Windows timezone ID: `Pacific Standard Time`
- Display timezone: Pacific Time (US & Canada)
- Daylight saving time: Handled by Windows according to the configured system timezone.

The schedule remains subject to user approval and confirmation that the dedicated Windows machine is normally powered on and idle then. If the machine is commonly off or asleep, select a known idle time instead; the scheduler must not wake the machine without separate approval.
