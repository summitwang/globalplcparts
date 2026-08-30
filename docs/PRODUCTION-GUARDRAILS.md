# GlobalPLCParts Production Guardrails and Secret Safety

## Purpose and authority

This document defines operational boundaries for work on the GlobalPLCParts repository while it is in supervised mode. It supplements `AGENTS.md`; if the two conflict, `AGENTS.md` controls.

Repository inspection and local validation do not authorize deployment, external-service changes, customer communication, commercial decisions, or production-data access.

## 1. Production systems

The following systems are supported by direct repository evidence.

| System | Repository evidence | Production relevance |
|---|---|---|
| Next.js application runtime | Next.js application code and build/start commands | Hosts the public website, admin pages, and API routes |
| Supabase | `@supabase/supabase-js`, `lib/supabase.ts`, RFQ route handlers | Stores RFQ records and supports server-side CRM reads and writes |
| Supabase Storage | RFQ browser and API upload code referencing the `rfq-files` bucket | Stores customer RFQ attachments |
| Resend | `resend` dependency and RFQ/quotation route handlers | Sends internal RFQ notifications, customer acknowledgements, and quotation email |
| Google Analytics 4 | Global `gtag.js` loading and analytics event helpers | Receives public-site usage events |
| Microsoft Clarity | Global Clarity loader and event helper | Receives public-site behavior events |
| Google site verification | `metadata.verification.google` in the root layout | Supports Google site-ownership verification; no Search Console API integration was found |
| Git | Git repository plus workflow rules in `AGENTS.md` | Source history and change-control boundary |

Systems mentioned but not established as active integrations:

- **Vercel:** `.vercel` is gitignored and Vercel credentials are covered by `AGENTS.md`, but no `vercel.json`, deployment workflow, or Vercel API integration was found. The production hosting provider is therefore not proven by repository source.
- **GitHub:** `AGENTS.md` protects GitHub tokens and discusses Git operations, but no GitHub Actions workflow or GitHub API integration was found. The remote hosting arrangement is not established by source inspected for this document.
- **Cloudflare and DNS:** `AGENTS.md` protects Cloudflare tokens and prohibits unapproved DNS changes. No Cloudflare SDK, configuration file, API call, or DNS automation was found. Treat both as protected possible infrastructure, not a confirmed application integration.

No payment provider, supplier platform, or automated customer-messaging service beyond Resend and customer-initiated WhatsApp links is established by repository evidence.

## 2. Environment variable registry

Only names referenced in tracked source are listed. Values must not be read to perform ordinary code inspection, documentation, linting, building, or health checks.

| Variable | Source-based purpose | Usage boundary | Sensitivity | May Codex read value? | May Codex modify value? | Commit value to Git? |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase project endpoint; also a server fallback | Client and server | **PUBLIC** by framework exposure, but operationally controlled | **No** by default | **No** without explicit approval | **Never** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase anonymous credential; also a server fallback | Client and server | **PUBLIC** by framework exposure, but security depends on Supabase policies | **No** by default | **No** without explicit approval | **Never** |
| `SUPABASE_URL` | Preferred server-side Supabase project endpoint | Server only | **SENSITIVE** | **No** by default | **No** without explicit approval | **Never** |
| `SUPABASE_SERVICE_ROLE_KEY` | Preferred server-side Supabase credential | Server only | **HIGHLY SENSITIVE** | **No** unless a future narrowly scoped action explicitly requires and authorizes it | **No** unless a future narrowly scoped credential operation explicitly authorizes it | **Never** |
| `RESEND_API_KEY` | Authorizes server-side Resend email requests | Server only | **HIGHLY SENSITIVE** | **No** unless a future narrowly scoped action explicitly requires and authorizes it | **No** unless a future narrowly scoped credential operation explicitly authorizes it | **Never** |
| `ADMIN_PASSWORD` | Shared-password check for protected admin and quotation operations | Server comparison; supplied from admin browser requests | **HIGHLY SENSITIVE** | **No** unless a future narrowly scoped action explicitly requires and authorizes it | **No** unless a future narrowly scoped credential operation explicitly authorizes it | **Never** |

`NEXT_PUBLIC_` means a value can be included in browser-delivered code; it does not mean Codex may change it or that it should be stored in Git. Public Supabase access must be constrained by database and storage security policies.

Analytics identifiers are currently embedded in application source rather than read from environment variables. They are operational configuration and must not be changed automatically even though they are not treated as secret credentials.

## 3. Secret handling policy

- `.env.local` and other real environment files must remain covered by the `.env*` Git ignore rule.
- Codex must not open, display, copy, summarize, or modify `.env.local` unless a future instruction explicitly authorizes a narrow operation that is also consistent with `AGENTS.md`.
- Secret values must never be pasted into documentation, source, issue text, commit messages, screenshots, examples, generated reports, build logs, or chat responses.
- Service-role keys, admin passwords, API keys, access tokens, GitHub tokens, Cloudflare tokens, Vercel tokens, and database credentials are **HIGHLY SENSITIVE**.
- Logs and error reporting must redact credentials, authorization headers, cookies, signed URLs, customer fields, and commercially sensitive content.
- A public client identifier or anonymous key is still controlled configuration and must not be changed automatically.
- Use environment-variable names and documented placeholders when configuration documentation is required.
- Never create, rotate, disable, or delete credentials merely to troubleshoot application behavior.
- If a secret appears unexpectedly, stop work, avoid repeating it, and ask the user for direction. Do not include the exposed value in the report.

## 4. Deployment safety policy

### Automatically allowed within an authorized local task

These actions are non-production and read-only with respect to business data:

- Local lint
- Local build
- `npm run health-check`
- Read-only Git inspection such as `git status`, `git diff`, and `git log`

A build may read configured local environment variables as part of normal framework operation, but Codex must not print or inspect their values. If a local validation command unexpectedly triggers an external production action, stop immediately.

### Requires explicit user approval

- Git commit
- Git push
- Production deployment
- Preview deployment when it may trigger external integrations or use production configuration
- Environment-variable additions, changes, or removals
- Production rollback
- DNS or domain changes
- GitHub branch-protection or repository-setting changes
- Supabase schema, RLS, storage, bucket, policy, retention, or data changes
- Resend domain, sender, webhook, key, or other configuration changes
- Analytics configuration or identifier changes
- Production service enablement, disablement, or restart when it changes external state

Approval must be specific to the action and target. Approval to edit code or run a local build does not authorize commit, push, preview, or production deployment.

### Prohibited without further review

- Deleting a production project or service
- Force pushing
- Rewriting shared or published Git history
- Destructive database migrations
- Dropping or truncating tables
- Deleting Supabase tables, buckets, or production storage objects
- Bulk deletion of production records or files
- Credential rotation or deletion
- Disabling RLS, authentication controls, storage policies, branch protection, or other security controls
- Running an undocumented recovery or rollback command against production

These actions require a dedicated risk review, exact target verification, recovery plan, and explicit authority. Some may remain prohibited even after ordinary task approval.

## 5. Business-operation safety

The following remain human-controlled:

- Customer RFQ replies
- Quotation amounts and quote approval
- Final pricing and discounts
- Payment instructions and payment decisions
- Shipping charges and commercial delivery commitments
- Product availability, condition, authenticity, warranty, and lead-time confirmation
- Supplier selection, negotiation, and communication
- Sending real quotation email
- Any acceptance of an order or other commercial commitment

Codex may prepare drafts, comparisons, internal calculations, or decision-support analysis when requested. Draft generation is not permission to transmit a message or make a commitment. A human must review the final content, commercial terms, recipient, and transmission action.

## 6. RFQ and CRM safety

### Repository-evidenced flow

1. The browser RFQ form collects customer and part-request information.
2. The current browser component can upload an attachment directly to the Supabase `rfq-files` bucket.
3. The browser sends the multipart form to `POST /api/rfq`.
4. The API can upload the attachment, insert a record into `rfq_requests`, request an internal notification email, and request a customer acknowledgement email.
5. The admin CRM sends the shared admin password in an `x-admin-password` header to load and update RFQ records.
6. `POST /api/rfq/quote` accepts an RFQ identifier and admin password, loads an RFQ, sends a customer quotation through Resend, and updates CRM quote/pipeline fields.

### Safety boundaries

- RFQ records contain customer and commercially sensitive information and must not be used in public examples, screenshots, documentation, or routine automated tests.
- Real customer names, contact details, attachments, requirements, quotations, and internal notes must not be copied into test fixtures.
- The current direct-browser plus server upload paths create a risk of duplicate or orphaned attachments.
- The use of `getPublicUrl` indicates that attachment confidentiality depends on the current storage policy and URL behavior. Do not assume an RFQ attachment is private.
- Shared-password API checks are not a substitute for user identity, MFA, role separation, session expiry, rate limiting, or per-user audit attribution.
- No automated test may call the RFQ submission or quotation endpoints against a real environment.
- Future RFQ testing should use synthetic fixtures, mocked Supabase/Resend adapters, or a dedicated non-production project with clearly marked test records.
- A dedicated test record must never use a real customer's identity, address, attachment, pricing, or request details.

No RFQ code or external data is changed by this policy document.

## 7. Supabase safety

Repository source uses two credential classes:

- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally available to browser code. Its safe use depends on correctly configured RLS and storage policies.
- `SUPABASE_SERVICE_ROLE_KEY` is preferred by the shared server client when present. It is server-only and **HIGHLY SENSITIVE** because a service-role credential may bypass normal row-level restrictions.

The server client currently falls back from server-specific variables to the `NEXT_PUBLIC_` URL and anonymous key. This fallback affects capability and must not be changed without code review and user approval.

Operational rules:

- Do not query production RFQ data for experimentation, demonstrations, or general testing.
- Do not automatically insert, update, or delete production records.
- Do not automatically create, alter, or delete schemas, tables, columns, functions, triggers, RLS policies, buckets, or storage policies.
- Do not download or expose production attachments.
- Prefer reviewed, reversible migrations for approved schema changes.
- Require an identified backup/restore path and data-loss assessment before production database work.
- Use a dedicated test project or mocked adapter for future automated tests.

## 8. Email and Resend safety

Sending email is an external production side effect. It may contact a customer, create a commercial expectation, expose data, affect sender reputation, or incur service usage.

- Automated tests must not trigger `resend.emails.send` against real configuration.
- Tests must not call `/api/rfq` or `/api/rfq/quote` in a mode capable of sending real email.
- The quotation endpoint must remain behind deliberate human commercial review and transmission control.
- Do not use a real customer email address for testing.
- Do not change sender domains, recipients, reply-to addresses, webhooks, or Resend credentials without explicit approval.
- Before email automation is considered, introduce a mock email adapter or dependency injection, a non-production/test mode that fails closed, synthetic recipients, and assertions that production sending is disabled.
- Delivery-status testing should use mocked responses until a dedicated, explicitly approved non-production email environment exists.

## 9. Git safety policy

- Never force push.
- Never rewrite shared or published history.
- Never use destructive Git cleanup to discard user work.
- Inspect `git status --short` before editing and again before handoff.
- Preserve unrelated working-tree changes.
- Report exact changed and untracked files after each task.
- Review the diff before commit.
- Commit only after the requested changes have been reviewed and commit approval is explicit.
- Push only after explicit user approval during supervised mode.
- Do not infer push approval from commit approval.
- Never stage environment files, credentials, customer exports, local database dumps, debug captures containing sensitive data, or unintended generated files.
- If unexpected changes or history are detected, stop and determine ownership before continuing.

## 10. Future automation permission levels

### LEVEL 0 — READ ONLY

Examples:

- Inspect tracked source and documentation
- Run the read-only health check
- Run local lint and build validation
- Produce stdout-only reports
- Run read-only Git inspection

These actions must still stay within the active task and must not access customer records, secrets, or production services.

### LEVEL 1 — SAFE LOCAL WRITE

Examples:

- Documentation
- Isolated non-production code changes
- Tests using synthetic fixtures and mocks
- Local validation tooling that does not mutate business data

Requirements: focused scope, exact changed-file report, appropriate validation, and diff review before any commit.

### LEVEL 2 — REPOSITORY WRITE

Examples:

- Git commit
- Git push
- Branch or pull-request changes

Requirements: explicit user approval during supervised mode, clean understanding of the diff, no secrets or customer data, and no destructive history operations.

### LEVEL 3 — PRODUCTION SIDE EFFECT

Examples:

- Deployment or rollback
- Email transmission
- Database or storage writes
- Production environment-variable changes
- DNS, analytics, or external-account changes

These always require explicit approval unless a future written policy narrowly authorizes a specific action, target, scope, validation, and rollback process. Customer communication boundaries in `AGENTS.md` continue to apply.

### LEVEL 4 — DESTRUCTIVE OR COMMERCIAL

Examples:

- Deleting production data or projects
- Credential rotation or deletion
- Force push or shared-history rewrite
- Final quotations and pricing decisions
- Payment decisions
- Supplier commitments
- Availability or delivery promises

These must remain human-controlled or undergo a dedicated future review that explicitly addresses authority, recovery, data loss, security, and commercial responsibility. Ordinary implementation approval is insufficient.

## 11. Incident stop conditions

Codex must immediately stop the affected operation, preserve evidence without exposing sensitive content, and ask for direction when:

- Unexpected files are modified or generated.
- A secret value, credential, token, private key, authorization header, or signed URL appears.
- A command would trigger or has unexpectedly triggered a production endpoint.
- Customer or supplier data is encountered outside an explicitly authorized business-data task.
- A script behaves differently from `docs/SCRIPTS-SAFETY-REGISTRY.md`.
- A build, test, health check, or lint command unexpectedly invokes a networked production action.
- Git status or history is not clean or expected for the task.
- A destructive command becomes necessary.
- A supposedly read-only process writes a report, cache, data file, image, external record, or message.
- The exact environment, project, bucket, database, branch, recipient, or deployment target cannot be verified safely.

Do not attempt to conceal, automatically repair, rotate, delete, reset, or clean up an incident without approval.

## 12. Recommended future safeguards

The following are recommendations only and are not implemented by this document:

- Add `.env.example` containing required variable names and non-secret placeholders only.
- Create clearly separated development/test Supabase and email configurations.
- Introduce mocked Supabase, storage, and Resend adapters for automated tests.
- Define synthetic RFQ fixtures and a controlled test-record naming/retention policy.
- Establish a preview deployment policy defining whether external integrations are disabled, mocked, or isolated.
- Run the health check in CI using no production credentials.
- Add protected branches, required reviews, and required validation checks.
- Add secret scanning for commits, pull requests, logs, and generated artifacts.
- Add dry-run-by-default behavior to every mutating script.
- Add backup, atomic write, diff preview, rollback, and post-write validation to catalog tools.
- Add provenance records for scraped/imported product data and images.
- Add audit logging for admin access, RFQ changes, exports, quote preparation, and approved communication actions.
- Separate production and non-production projects, credentials, storage buckets, domains, recipients, and analytics streams.
- Replace shared-password admin access with authenticated identities, MFA capability, roles, session expiry, and audit attribution.
- Make RFQ attachments private and use reviewed, expiring access mechanisms.
- Add rate limiting, spam controls, server-side validation, safe HTML escaping, and sanitized errors before expanding RFQ automation.

## Final rule

When authority is unclear, choose the lower permission level. A successful local check proves only that the checked local condition passed; it never grants permission for repository writes, deployment, external-service mutation, customer contact, or commercial action.
