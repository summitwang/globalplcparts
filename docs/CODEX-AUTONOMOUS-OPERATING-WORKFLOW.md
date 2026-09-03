# GlobalPLCParts Codex Autonomous Operating Workflow

## Purpose and authority

This document defines a future, progressively autonomous operating model for GlobalPLCParts. It is policy and workflow only: it does not schedule a task, authorize a recurring run, create a branch or worktree, publish repository changes, or grant production access.

`AGENTS.md`, `docs/PRODUCTION-GUARDRAILS.md`, `docs/TEST-PREVIEW-STRATEGY.md`, and `docs/SCRIPTS-SAFETY-REGISTRY.md` remain authoritative. The repository is currently in **Stage 1 — SUPERVISED**. Every action must stay within its explicit task contract and the lowest applicable autonomy class.

## 1. Autonomy classes

### Class A — Automatic read-only

Class A work may eventually run without approval for every individual occurrence after a specific recurring task has been reviewed and enabled. It may inspect local repository state and print reports, but it must not change tracked business data, production systems, customer data, or external services.

Repository-supported candidates include:

- `npm.cmd run health-check`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run validate`
- Read-only Git working-tree inspection
- Repository architecture and route checks
- Broken local product-image reference detection
- Catalog field, count, brand, and duplicate-slug checks
- Blog inventory and duplicate-slug checks
- SEO structure, sitemap, robots, canonical, and metadata audits
- Dependency and framework version observation without installation or upgrade
- Internal stdout reports, or reports written only to a separately approved local report path

Class A rules:

- No production writes, deployment, customer-data access, or external side effects.
- No scraper, importer, generator, cleaner, mapper, image acquisition, product expansion, or other mutation script.
- No automatic dependency installation or upgrade.
- No environment-variable changes and no inspection or output of secret values.
- A build may perform normal framework artifact generation and may identify configured environment files, but the task must not inspect or report their values.
- A Class A run must stop if a supposedly read-only command changes an unexpected repository file.

Suggested cadence after separate approval:

| Frequency | Suggested Class A work |
|---|---|
| Daily | Git status, health-check, and validation |
| Weekly | Catalog, image, blog, routes, SEO structure, Git hygiene, and build observations |
| Monthly | Dependency/version awareness, warning trends, security hygiene, architecture, and automation-policy review |

These frequencies are recommendations, not schedules or standing authorization.

### Class B — Automatic local safe write

Class B work may eventually make narrowly scoped, reversible changes in an isolated local branch or worktree. It must never publish automatically during the supervised phase.

Possible candidates, after their individual contracts are approved, include:

- Documentation maintenance
- Clearly safe metadata cleanup supported by repository evidence
- Mechanical lint and type cleanup that preserves runtime behavior
- Internal report generation to an approved path
- Isolated tests using synthetic fixtures and mocked external services
- Minor non-business UI or code maintenance
- Deterministic broken internal-link repair
- Narrow, low-risk SEO code improvements

A small diff is not automatically Class B. Customer, commercial, production, credential, external-service, catalog-scale, or uncertain runtime impact moves work to Class C or D.

Every Class B task must:

1. Start from a clean and understood Git state.
2. State its intended scope before editing.
3. Use an approved task contract and modify only its allowed paths.
4. Prefer an isolated Git branch or worktree.
5. Run `npm.cmd run validate` after changes.
6. Produce an exact file list and concise diff summary.
7. Stop without cleanup or publication if validation fails or unexpected files change.
8. Never commit, push, create a pull request, merge, or deploy automatically during Stage 1.
9. Wait for explicit approval before repository publication.

### Class C — Approval required

The following require task-specific, explicit user approval during the supervised phase:

- Git commit, push, pull-request creation, merge, or branch publication
- Vercel Preview deployment or any other preview deployment
- Production deployment or rollback
- Environment-variable additions, changes, or removals
- Supabase schema, RLS, policy, storage, bucket, or data changes
- Database reads or writes outside a separately approved, isolated test contract
- External API, Vercel, GitHub, Cloudflare, or DNS configuration changes
- Resend sender, domain, recipient, webhook, credential, or email configuration
- Analytics or Search Console configuration
- Enabling a new scheduled or recurring automation
- Running a reviewed scraper, importer, image acquisition, mapper, generator, or other mutation system
- Large-scale product, catalog, content, image, or SEO changes
- Dependency installation, removal, or upgrade

Approval applies only to the named action, version, scope, command, target, and occurrence. Approval for one command or run does not authorize related commands, broader targets, retries with different behavior, or future runs.

### Class D — Human controlled

The following remain human-controlled unless a separate future policy explicitly changes the boundary:

- Customer RFQ replies and other customer communication
- Final quotations, pricing, discounts, shipping charges, and payment decisions
- Product availability, condition, lead-time, authenticity, or warranty commitments
- Supplier selection, negotiation, and communication
- Commercial commitments and order acceptance
- Sending real customer quotation email
- Credential rotation or deletion
- Destructive production deletion
- Force push or shared-history rewrite

Codex may prepare drafts, pricing analysis, quotation drafts, supplier-research summaries, and internal recommendations when explicitly requested. A human must review and perform the final business or destructive action.

## 2. Operating cycles

### Future daily cycle

1. Verify the repository, branch/worktree, and Git state.
2. Run the approved safe validation command.
3. Review health-check PASS, WARN, and FAIL results.
4. Review catalog required fields, counts, brands, and slug integrity.
5. Review local image references, fallbacks, and heavy reuse.
6. Review routes, sitemap, robots, and other SEO structures.
7. Review blog integrity and content inventory.
8. Identify deterministic, actionable issues.
9. Assign every issue to Class A, B, C, or D and assign severity.
10. Perform Class B local work only when a previously approved automation contract permits it.
11. Re-run validation after any approved local write.
12. Produce the standard operating report.
13. Request approval only for clearly identified Class C actions; defer Class D decisions to a human.

This cycle is not implemented or scheduled by this document.

### Future weekly cycle

- Product catalog completeness, duplicate detection, category consistency, and brand coverage
- Product-image missing-file, fallback, reuse, and mapping observations
- Blog/content inventory and publication structure
- Sitemap size and structural health
- SEO metadata, canonical, structured-data, and internal-link consistency
- Build result and build-time trend
- Dependency and framework version awareness without upgrades
- High-risk scripts registry drift and new-script classification
- Git hygiene, unexpected generated files, and stale local artifacts
- Consolidated weekly operating report with warning changes

Weekly work remains local and must not write production or external systems.

### Future monthly cycle

- Catalog and content growth trends
- Brand and category coverage trends
- SEO architecture and stale-page/content review
- Technical debt and validation-history review
- Warning trend and unresolved-risk review
- Automation reliability and efficiency
- Secret, environment-file, dependency, and security hygiene
- Legacy and versioned script-family review
- Reassessment of which narrowly defined tasks are safe to automate

## 3. Issue severity

| Severity | Meaning | Required response |
|---|---|---|
| **INFO** | Observation with no action required | Record when useful; continue within contract |
| **LOW** | Deterministic safe-maintenance opportunity | Queue Class A analysis or contracted Class B work |
| **MEDIUM** | Planned local work or deeper review is needed | Do not broaden the current task; create a scoped proposal |
| **HIGH** | Potential production, security, customer, or business impact | Stop automatic work and request explicit approval |
| **CRITICAL** | Possible secret exposure, production-data/customer-data risk, destructive behavior, deployment/account compromise, or unexpected external side effect | Stop immediately, avoid repeating sensitive content, preserve evidence safely, and request direction |

Severity and autonomy class are related but not interchangeable. A low-severity issue may still require Class C approval because of its target or side effects.

## 4. Autonomous task contract

No recurring task may execute merely because it appears useful. It must first have an approved contract containing:

| Field | Required definition |
|---|---|
| Task ID | Stable unique identifier |
| Task name | Concise operational name |
| Autonomy class | A, B, C, or D |
| Purpose | Exact expected benefit |
| Allowed paths | Files/directories that may be inspected or changed |
| Forbidden paths | Sensitive, business-data, production, or out-of-scope paths |
| Allowed commands | Exact commands or tightly scoped command families |
| Forbidden commands | Mutation, deployment, communication, or destructive commands |
| Network permission | None, read-only approved targets, or explicitly scoped access |
| Production permission | Normally none; exact target and action if separately approved |
| External-service permission | Named service and allowed operation, or none |
| Validation requirement | Required checks and acceptable warning baseline |
| Expected outputs | Stdout, approved report path, or local diff |
| Stop conditions | Task-specific plus the global conditions below |
| Approval requirement | When and from whom approval is required |
| Estimated frequency | Proposed cadence, not authorization |

Contract changes require review. An automatic task must not accept input that silently expands its commands, paths, services, or side effects.

## 5. Safe worktree rule

Future Class B local-write automation should use an isolated branch or worktree instead of accumulating unattended changes on the primary working tree:

```text
main
  -> isolated Codex task branch/worktree
  -> scoped change
  -> validate
  -> diff and report
  -> explicit approval
  -> commit/push/merge
```

The task must verify a clean starting point and exact repository identity before creating isolation. During Stage 1, existing explicit approval rules remain authoritative. This document does not create a branch or worktree.

## 6. Failure and stop conditions

Codex must stop the affected autonomous process when:

- Git state is unexpectedly dirty or cannot be understood.
- An unexpected file changes or a read-only task writes a file.
- `npm.cmd run validate` fails outside an explicitly documented warning allowance.
- A secret, credential, authorization header, signed URL, or environment-variable value appears.
- Customer, supplier, RFQ, quotation, pricing, or other business information appears unexpectedly.
- Production identity, repository, branch, worktree, service, database, bucket, domain, deployment, or recipient cannot be verified.
- An external service would be changed or a task needs credentials beyond its permission level.
- A high-risk script would need to execute without specific Class C approval.
- Script behavior differs from `docs/SCRIPTS-SAFETY-REGISTRY.md`.
- Scope expands beyond the approved task contract.
- Destructive cleanup, reset, rollback, deletion, or history rewriting becomes necessary.
- A validation or build unexpectedly invokes a production action or external side effect.

Do not hide, automatically clean, reset, delete, retry against a different target, or weaken safeguards after a stop condition.

## 7. Standard operating report

```text
GlobalPLCParts Codex Operations

Status: PASS | ATTENTION | BLOCKED

Validation:
- lint: PASS | WARN | FAIL | NOT RUN
- health-check: PASS | WARN | FAIL | NOT RUN
- build: PASS | FAIL | NOT RUN

Findings:
- Critical: ...
- High: ...
- Medium: ...
- Low: ...
- Info: ...

Automatic actions completed:
...

Approval required:
...

Deferred:
...

Git state:
...

Production changes: NONE unless explicitly approved
External side effects: NONE unless explicitly approved
```

Reports must not contain secret values, customer information, signed URLs, quotation details, or other sensitive business data.

## 8. Automation roadmap

1. **Stage 1 — SUPERVISED (current):** Codex operates from explicit tasks and waits for publication or production approval.
2. **Stage 2 — AUTOMATIC READ-ONLY:** Individually approved Class A health and audit contracts may run on an approved schedule.
3. **Stage 3 — LOCAL AUTONOMY:** Selected Class B contracts may create validated changes in isolated local worktrees.
4. **Stage 4 — REPOSITORY AUTOMATION:** Reviewed workflows may create branches, commits, or pull requests within explicit repository permissions.
5. **Stage 5 — CONTROLLED PRODUCTION:** Only narrowly scoped production workflows with explicit targets, safeguards, validation, rollback, monitoring, and approval.

Commercial and customer decisions remain human-controlled at every stage unless a separate explicit policy changes a specific boundary.

## 9. Initial automation candidates

Listing a candidate does not enable or authorize it.

| Priority | Candidate | Frequency | Class | Risk | Prerequisites | Enable now? | Current blockers |
|---:|---|---|---|---|---|---|---|
| 1 | Daily health-check | Daily | A | Low | Approved task contract, scheduler choice, isolated logs/stdout handling, warning baseline | No | Scheduling and output-retention policy not approved |
| 2 | Regular validation | Daily or before approved local publication | A | Low | Approved contract, build-artifact expectations, timeout/resource policy | No | No recurring execution approval or scheduler |
| 3 | Catalog integrity report | Daily | A | Low | Reuse read-only health checks; define report destination and count-drift thresholds | No | Report storage and alert thresholds undefined |
| 4 | Product image integrity report | Daily or weekly | A | Low | Define fallback/reuse thresholds and non-incident baseline | No | Known fallback/reuse warnings need trend policy |
| 5 | SEO structural audit | Weekly | A | Low | Define exact local checks and supported metadata expectations | No | No approved audit contract or report retention |
| 6 | Blog integrity/content inventory | Weekly | A | Low | Define inventory fields and safe content-source parsing | No | No approved recurring contract |
| 7 | Git repository health | Daily | A | Low | Define expected clean/dirty states and notification behavior | No | Development-time changes would create expected warnings |
| 8 | Weekly operating report | Weekly | A | Low | Approve inputs, output location, retention, and redaction | No | Report persistence and delivery mechanism undefined |

Class B remediation must be contracted separately from these Class A observations. A report finding does not authorize its automatic repair.

## 10. Current known baseline

The current read-only health-check baseline is:

- **16 PASS**
- **3 WARN**
- **0 FAIL**

Known warning categories are:

- Product records using fallback or SVG image paths
- Heavily reused product image paths
- High-risk automation scripts present in the repository

Git changes during reviewed development may still produce a warning, but they are not part of the approved clean-tree baseline. An unexpected dirty tree during unattended execution remains an ATTENTION condition.

These warnings are not automatically production incidents. They require trend comparison and context. Escalate only when a warning materially changes, crosses an approved threshold, exposes sensitive data, indicates an unexpected write, or creates production/customer risk.

## 11. Final recommendation

After this workflow and a specific task contract are approved, implement **a daily read-only `npm.cmd run health-check`** first.

It is the lowest-risk useful recurring candidate because it is deterministic, stdout-only, does not import or execute high-risk automation scripts, checks catalog/blog/image/route/SEO/RFQ structure without accessing RFQ records or external services, and already distinguishes warnings from genuine failures. Before enabling it, approve the scheduler, execution directory, timeout, output retention/redaction, expected dirty-tree behavior, warning-change thresholds, and notification method.

Do not implement or schedule this recommendation until that separate approval is granted.
