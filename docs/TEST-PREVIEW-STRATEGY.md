# GlobalPLCParts Test and Preview Environment Strategy

## Purpose and authority

This document proposes a future testing, preview, and release model for GlobalPLCParts. It does not create an environment, deployment, credential, test record, database object, storage bucket, email configuration, or CI workflow.

`AGENTS.md`, `docs/PRODUCTION-GUARDRAILS.md`, and `docs/SCRIPTS-SAFETY-REGISTRY.md` remain authoritative. A proposed workflow in this document is not permission to perform an external or production action.

## 1. Current environment model

### Confirmed repository evidence

| Area | What is confirmed |
|---|---|
| Local development | `npm run dev` starts the Next.js development server. Node dependencies and a lock file are present. |
| Local production validation | `npm run build` creates an optimized Next.js build; `npm run start` serves a completed build. |
| Local static validation | `npm run lint` and the read-only `npm run health-check` commands exist. |
| Git | The workspace is a Git repository with supervised commit/push rules in `AGENTS.md`. |
| Supabase application dependency | Browser and server code use Supabase. RFQ code references the `rfq_requests` table and `rfq-files` storage bucket. |
| Resend side effects | RFQ and quote route handlers can call `resend.emails.send` for internal notification, customer acknowledgement, and quotation email. |
| External analytics | The root layout loads Google Analytics 4 and Microsoft Clarity in the browser. |
| Test tooling | No unit-test framework, browser-test configuration, CI workflow, dedicated test command, or mock service layer was found. |
| Deployment configuration | No `vercel.json`, deployment script, or tracked deployment workflow was found. |

### Externally unverified assumptions

- **GitHub repository:** local Git is confirmed, but tracked source does not establish the current remote host, branch protections, actions, or repository settings. GitHub usage requires external verification.
- **Vercel production deployment:** `.vercel` is gitignored and Vercel is addressed by the production guardrails, but repository source does not prove the active production host, project, team, domains, deployment branch, or environment-variable mapping.
- **Supabase production identity:** the code dependency is confirmed. The specific production project, region, RLS policies, storage policies, backups, and separation from test environments require external account verification.
- **Resend production configuration:** email-capable code is confirmed. Active keys, verified domains, sending mode, webhooks, and recipient controls require external verification.
- **Separate test or staging environment:** no repository evidence proves that one exists.
- **Preview environment:** no repository evidence proves that previews are configured or safely isolated.

Until those items are verified, assume that configured external credentials may point to production. Local code must not call RFQ, storage, database, or email paths during automated testing.

## 2. Desired future environment model

```text
LOCAL
  isolated checks + mocks
       ↓ reviewed code branch
PREVIEW
  temporary UI verification + non-production integrations
       ↓ approved integration candidate
TEST / STAGING BACKEND
  synthetic RFQs + dedicated storage + mock/sandbox email
       ↓ explicit release approval
PRODUCTION
  real traffic + real RFQs + real storage + real email
```

### LOCAL

Purpose:

- Coding and documentation
- Lint, health check, and build
- Isolated unit and static tests
- Component/route logic tests with deterministic fixtures
- Mocked Supabase, storage, and email behavior

Local automation must default to no network and no external side effects. Developers may run the application interactively, but automated tests must not infer that locally configured environment variables are safe test credentials.

### PREVIEW

Recommended future model:

- Vercel Preview deployment or another explicitly identified preview platform
- Preview-specific, non-production environment variables
- UI and safe integration verification
- No real customer traffic
- No real customer or supplier data
- No real quote email
- No production database or storage writes
- Clear visual indication that the deployment is non-production
- Access restrictions where admin/RFQ behavior is exposed

Preview does not exist safely merely because a deployment has a preview URL. Isolation must be proven for every external dependency.

### TEST / STAGING BACKEND

Preferred characteristics:

- Separate Supabase project, or an explicitly isolated fallback described later
- Dedicated test tables/schema and storage bucket
- Synthetic, clearly marked RFQ records only
- Dedicated retention and cleanup policy
- Mock email by default; sandbox/non-delivery mode if explicitly available and approved
- No production service-role credential
- Separate logs, monitoring, and audit trail
- Environment identity displayed or machine-verifiable so a test cannot silently target production

### PRODUCTION

Production contains:

- The real public website
- Real RFQ and customer records
- Real RFQ attachments
- Real email sending
- Real analytics streams
- Human-approved releases and rollback actions

Production must never be a general test environment. Synthetic production probes, if ever approved, require a separate narrowly scoped policy and must not send customer communication or alter commercial state.

## 3. Recommended deployment flow

```text
Codex task
  → local diff review
  → lint
  → health-check
  → build
  → isolated automated tests
  → preview deployment
  → preview verification
  → explicit production approval
  → production deployment
  → post-deployment verification
```

### Potentially automatic stages

After implementation and policy approval, these may become automatic:

- Local lint
- Read-only health check
- Local/CI build without production credentials
- Unit/static tests using mocks and synthetic fixtures
- Secret scanning
- Catalog and route integrity validation
- Creation of a preview only after preview isolation is proven and its policy explicitly permits automation
- Read-only preview smoke tests that cannot trigger RFQ, storage, email, or admin mutations

### Approval-gated stages

- Creation of any preview that might access shared or production services
- Preview integration tests that write non-production records
- Database/storage migrations in any shared environment
- Production approval
- Production deployment and rollback
- Environment-variable changes
- Any test capable of sending email
- Any production or customer-data access
- Post-deployment action that writes data or communicates externally

During supervised mode, production promotion always requires explicit user approval after validation results, risks, data impact, and rollback steps are reported.

## 4. Local testing policy

### Safe local commands

Within an authorized task, Codex may run:

```powershell
npm.cmd run lint
npm.cmd run health-check
npm.cmd run build
```

Future isolated test commands may also be safe when they:

- Use deterministic synthetic fixtures.
- Replace external adapters with mocks or fakes.
- Fail closed when test configuration is absent.
- Do not read `.env.local` values for assertions or reporting.
- Do not write catalog, blog, product images, RFQ data, storage, or external services.
- Do not execute scripts classified as mutating/networked in the scripts safety registry.

### Prohibited local-test behavior

Local tests must not:

- Call a real `/api/rfq` submission path capable of database, storage, or email side effects.
- Call `/api/rfq/quote` against a real backend.
- Send real email or use a real customer address.
- Write to production Supabase.
- Upload to production storage.
- read or export real RFQ/customer records.
- Mutate production or repository catalog data.
- Execute scraper, importer, generator, cleanup, mapper, backfill, image-engine, product-expansion, or image-acquisition families.
- Depend on cleanup of production data to restore safety.

Builds must be monitored for unexpected external behavior. If a build invokes a production action or performs an unanticipated network mutation, stop immediately.

## 5. RFQ test strategy

### Current danger

The current RFQ submission flow can upload storage objects, insert database records, and request two emails. The quote route can load a real RFQ, send a quotation email, and update quote/pipeline state. Calling these routes is therefore not a harmless smoke test.

The browser RFQ implementation and server route can both upload an attachment, creating an additional duplicate/orphan-file risk during testing.

### Future safe approach

1. Introduce service boundaries for RFQ persistence, attachment storage, and email.
2. Unit-test validation and orchestration with in-memory mocks.
3. Use deterministic synthetic fixtures such as:
   - Customer/company: `TEST GlobalPLCParts Fixture 001`
   - Contact: `TEST User 001`
   - Email: `rfq-test-001@example.com` or another reserved example domain
   - Part number: `TEST-PART-001`
   - Details: a clear `TEST RECORD — NO COMMERCIAL ACTION` prefix
4. Use small, harmless test-only attachments containing no customer, supplier, pricing, credential, or proprietary information.
5. Prefer a dedicated test backend for any real integration request.
6. Add a mandatory test marker to every test record and verify the environment before insertion.
7. Block customer acknowledgement and quotation transmission in test mode.
8. Define ownership, maximum retention, and cleanup before generating integration records.

### Cleanup policy

- Prefer isolated test projects that can be reset without touching production.
- Delete only records carrying the exact test-run identifier and only from a verified non-production environment.
- Preview the deletion set before applying cleanup.
- Retain enough test-run logging to prove what was created and removed without recording secrets.
- If target identity is uncertain or cleanup would be broad/destructive, stop and request approval.
- Cleanup against any external backend remains an external write and requires the approval assigned to that environment.

Real RFQ records must never be copied into fixtures or used to validate filters, exports, PDFs, attachments, email, or CRM UI behavior.

## 6. Supabase test strategy

### Option A — Separate test Supabase project (preferred)

Advantages:

- Strongest project-level isolation from production.
- Separate credentials, database, storage, logs, quotas, and destructive reset boundary.
- Lower risk that a faulty test queries or modifies production.
- Easier to identify test resources and enforce test-specific retention.

Costs and cautions:

- Additional project configuration and maintenance.
- Schema migrations must be kept aligned intentionally.
- Test project identity and credentials must still be protected.
- Creation and configuration require explicit approval.

### Option B — Isolated test schema/tables/bucket

Use only if a separate project is unavailable and Supabase capabilities/policies support a verifiable isolation design.

Advantages:

- Lower infrastructure overhead.
- May reuse an existing non-production project.

Risks:

- Shared-project credentials or configuration can cross boundaries.
- Naming mistakes can target production tables or buckets.
- Service-role access may bypass logical separation.
- Shared quotas, logs, functions, and policies reduce isolation.
- Cleanup is more dangerous.

Required safeguards would include explicit test-only names, least-privilege credentials, policy enforcement, environment assertions, test markers, bounded cleanup, and a reviewed prohibition on production table/bucket access.

### Option C — Mocks for local automated tests

Advantages:

- No external data or storage side effects.
- Fast, deterministic, and suitable for CI.
- Can test validation, errors, retries, and orchestration safely.

Limitations:

- Cannot prove real RLS, storage policy, SDK, migration, or network behavior.
- Must be supplemented later by controlled non-production integration tests.

Recommended order: build mocks first, create a separate test project when integration coverage is approved, and use same-project isolation only as a reviewed fallback.

No project, schema, table, policy, record, or bucket is created by this strategy.

## 7. Resend and email test strategy

Recommended future layers:

1. **Local mock provider:** capture structured email requests in memory and assert sender, intended recipient class, subject, escaping, and template fields without network access.
2. **Fail-closed test mode:** application startup or the email adapter must reject real sending when the environment is marked test/preview.
3. **Non-delivery/sandbox mode:** use only if the selected provider explicitly supports it and the user approves its configuration.
4. **Dedicated test recipient:** if an approved integration test must deliver, use an address owned for testing—not a customer, supplier, or broad distribution list.
5. **Production email gate:** real sending must require verified production identity and deliberate human action where customer/commercial communication is involved.

The quotation endpoint must never be triggered automatically against real configuration. Test email payloads must use synthetic data and must not reproduce a real quotation, amount, customer address, or supplier detail.

## 8. Preview deployment policy

A future Vercel Preview deployment must follow these rules:

- Verify the Vercel project, team, Git branch, and environment classification before deployment.
- Use preview-specific non-production variables wherever possible.
- Never provide a production Supabase service-role credential to preview.
- Preview must not write production `rfq_requests` data or the production `rfq-files` bucket.
- Preview must not read production customer/RFQ data.
- Preview must not send real customer, supplier, internal sales, acknowledgement, or quote email.
- Disable or mock mutation-capable RFQ and quote paths until a dedicated test backend is attached.
- Prevent preview analytics from contaminating production analytics, or explicitly disable analytics until a reviewed preview stream exists.
- Treat preview URLs as verification endpoints, not customer-facing publication.
- Do not place secrets in preview URLs, logs, build output, screenshots, or browser-delivered variables.
- Apply access restrictions when admin or test interfaces are present.
- Promotion to production requires explicit approval during supervised mode.

No preview should be created when only production credentials are available.

## 9. Test data policy

- Use synthetic data only.
- Prefix test companies, contacts, RFQs, files, and notes with `TEST`.
- Assign a deterministic test-run identifier to every generated record and artifact.
- Use reserved example domains such as `example.com`, `example.net`, or `example.org` when delivery is not required.
- Never copy real customer or supplier names, email addresses, phone numbers, addresses, attachments, internal notes, pricing, or requirements.
- Never use production exports as test fixtures.
- Keep fixtures deterministic, minimal, reviewed, and free of secrets.
- Store fixtures only in approved test locations.
- Define retention and cleanup before running integration tests.
- Cleanup must be scoped to the exact test-run identifier and verified non-production target.
- Do not mutate `data/products.json`, blog data, brand SEO data, or production catalog records for testing.
- Do not use scraped or externally acquired images as test artifacts unless their use has been separately reviewed.

## 10. Production release checklist

Before requesting production approval, report and confirm:

- [ ] Working tree and current branch are understood.
- [ ] Exact changed and untracked files are reported.
- [ ] Unrelated user changes are preserved.
- [ ] No secrets, environment files, customer data, or unintended generated files are staged.
- [ ] Lint passes.
- [ ] Read-only health check passes with warnings explained.
- [ ] Production build passes.
- [ ] Applicable isolated tests pass.
- [ ] Approved preview verification passes.
- [ ] Preview used no unintended production service or side effect.
- [ ] Database, storage, email, analytics, and customer-data impact is documented.
- [ ] Migration and data-loss risks are documented where applicable.
- [ ] Rollback plan and rollback trigger are documented.
- [ ] Deployment target, project, branch, and environment identity are verified.
- [ ] Explicit user approval for production deployment is received.

The checklist prepares an approval request; completing it does not itself authorize deployment.

## 11. Rollback strategy

### Code rollback

- Identify the exact release commit and last known good commit.
- Prefer a reviewed revert or forward fix that preserves shared history.
- Never use force push or destructive reset on shared work.

### Vercel deployment rollback

- Verify the production project, domain, current deployment, and intended prior deployment.
- Document whether rollback affects environment variables, functions, builds, or external integrations.
- Use platform rollback only after explicit approval.

### Database migration rollback

- Every approved migration should define reversibility before application.
- Separate schema rollback from data restoration.
- Identify irreversible transformations and data-loss risk explicitly.
- Never run destructive rollback SQL automatically.

### Data backup and restore

- Define backup scope, timestamp, retention, encryption, and restore test.
- Verify the target environment before backup or restore.
- Restore only with explicit approval and a documented impact assessment.

### Environment-variable rollback

- Record variable names and configuration versions without exposing values.
- Verify which deployment environments received a change.
- Restore through the authorized platform without printing values.
- Rebuild/redeploy only when separately approved.

Rollback execution is a production side effect and remains approval-gated. A rollback plan is not standing authorization to execute it.

## 12. Test automation roadmap

### Stage A — Current safe checks

- Lint
- Read-only health check
- Production build validation
- Read-only Git/diff inspection

No new implementation is part of this document.

### Stage B — Isolated automated tests with mocks

- Catalog and content loader tests
- Route/metadata logic tests
- RFQ validation tests with synthetic fixtures
- Mock Supabase database/storage adapters
- Mock email adapter
- Authentication failure and HTML-escaping tests

### Stage C — Preview validation

- Establish preview environment identity and access policy.
- Attach non-production variables or keep integrations disabled.
- Add read-only UI, navigation, accessibility, and metadata smoke tests.
- Prove that RFQ and email side effects cannot reach production.

### Stage D — Safe non-production integration tests

- Use a dedicated test Supabase project if approved.
- Create bounded synthetic RFQ/storage tests.
- Use mock/non-delivery email first.
- Add deterministic cleanup with environment assertions and audit logging.

### Stage E — Controlled CI/CD automation

- Required lint, health, build, tests, secret scanning, and preview checks.
- Protected production branch and required human reviews.
- Explicit production promotion gate.
- Auditable deployment and rollback procedures.

Progression between stages requires review. Passing one stage does not authorize the next.

## 13. Required future decisions

The user will need to approve or determine:

- Whether to create a separate Supabase test project.
- Whether a same-project isolated schema/table/bucket fallback is acceptable.
- Whether to create a dedicated Resend sandbox/non-delivery setup or use mocks only.
- Whether previews may access any shared service.
- Whether preview analytics should be disabled or use separate streams.
- Which Vercel project/team and environment mapping are authoritative, if Vercel is used.
- Branch strategy and protected production branch.
- CI provider and workflow.
- Required checks and review count before merge.
- Preview access controls and retention.
- Synthetic RFQ naming, retention, and cleanup ownership.
- Migration approval and rollback standards.
- Production deployment approval method and authorized deployers.
- Post-deployment verification and incident-response ownership.

## 14. Safety stop conditions

Codex must stop the affected operation and request direction when:

- Only production credentials are available.
- A test would write production database or storage data.
- A test would send real email or contact a real recipient.
- A preview would read or write production RFQ/customer data.
- Environment identity is uncertain.
- The production project, deployment, domain, database, bucket, Git branch, or recipient cannot be verified.
- A build/test unexpectedly accesses a production/network service.
- Customer or supplier information appears in fixtures, logs, output, or screenshots.
- A supposedly isolated test requires production cleanup.
- Cleanup is broad, destructive, or cannot be scoped to an exact test-run identifier.
- A secret appears in output or a file.
- Unexpected repository files are modified.
- A script behaves differently from the scripts safety registry.
- Rollback or destructive commands become necessary.

Do not work around a stop condition by reusing production credentials, weakening policies, redirecting email, deleting evidence, or silently changing the target.

## Final principle

Testing is safe only when environment identity and side-effect isolation are proven. When either is uncertain, use mocks and static checks, or stop for approval.
