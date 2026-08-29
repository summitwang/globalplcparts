<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# GlobalPLCParts Codex Operating Rules

## Project role

This repository powers GlobalPLCParts, a commercial industrial automation parts website.

Codex may assist with:
- Website development and maintenance
- SEO improvements
- Product and brand pages
- Blog and content publishing
- Technical documentation
- Data processing and import scripts
- Performance and accessibility improvements
- Analytics and reporting
- RFQ system maintenance
- Admin dashboard maintenance
- Testing and code quality

## Current operating mode

The project is currently in SUPERVISED MODE.

Codex may inspect, analyze, edit, and test the local repository when explicitly asked.

Do not deploy, push production changes, modify production services, or perform destructive actions unless the user explicitly approves that action.

## Customer communication boundary

Codex must NOT independently:

- Reply to customer RFQs
- Send quotations
- Negotiate prices
- Confirm product availability to customers
- Promise delivery dates
- Accept payments
- Communicate with suppliers on behalf of the business
- Send WhatsApp, email, social DM, or other customer messages

Codex may draft suggested replies or quotations for human review when requested.

Final customer communication remains a human responsibility.

## Pricing and commercial rules

Do not independently:

- Change product pricing
- Change quotation pricing
- Change payment instructions
- Change shipping charges
- Change supplier costs
- Approve discounts
- Create commercial commitments

Any commercial decision requires explicit user approval.

## Production safety

Never perform destructive production actions without explicit approval.

This includes:

- Deleting production database records
- Dropping or truncating database tables
- Removing Supabase storage data
- Deleting production files
- Deleting Git branches containing unmerged work
- Force pushing
- Running `git reset --hard` on work that may contain changes
- Rewriting published Git history
- Disabling production services
- Changing DNS records
- Changing production domains
- Changing payment configuration
- Rotating or deleting production credentials

Prefer reversible changes.

## Git rules

Before editing:

1. Inspect the relevant files.
2. Understand the existing implementation.
3. Check the current Git status.
4. Preserve unrelated working changes.

For meaningful changes:

- Keep changes focused on the requested task.
- Do not modify unrelated files.
- Do not force push.
- Do not push directly to production branches unless explicitly approved.
- Clearly summarize files changed and why.
- Run appropriate validation before recommending deployment.

Never discard user changes merely to make the repository clean.

## Next.js rule

Preserve and follow the Next.js agent rules above.

Because this project uses a newer Next.js version with breaking changes, consult the repository's installed Next.js documentation when available before relying on older Next.js assumptions.

## Secrets and credentials

Never commit secrets.

Do not place any of the following into tracked source files:

- API keys
- Passwords
- Supabase service-role keys
- Database credentials
- Resend API keys
- Admin passwords
- Access tokens
- GitHub tokens
- Cloudflare tokens
- Vercel tokens
- Social-media credentials

Environment secrets must remain in appropriate local or platform environment-variable storage.

Never print full secret values into logs, commits, documentation, screenshots, or chat responses.

## Environment files

Treat `.env`, `.env.local`, and production environment variables as sensitive.

Do not commit them unless the file contains only documented placeholders and no real credentials.

Use `.env.example` for documenting required variable names when appropriate.

## Database rules

Production database changes require extra care.

Before schema changes:

- Inspect existing schema and application usage.
- Prefer migrations or reversible SQL.
- Explain the expected effect.
- Identify potential data-loss risks.

Never delete production data merely to fix an application problem.

## RFQ data

RFQ and customer records may contain commercially sensitive information.

Do not expose customer names, email addresses, phone numbers, addresses, quotation details, or internal notes outside the systems where they are required.

Do not use real customer data in public examples.

## Testing

Before considering a code task complete, run the relevant available checks where practical, such as:

- Type checking
- ESLint
- Build
- Targeted tests
- Relevant scripts

If validation cannot be run, explicitly state why.

Do not claim a change works unless it has either been validated or clearly marked as unverified.

## Dependency changes

Do not add, remove, or substantially upgrade dependencies without explaining why.

Prefer existing project dependencies when they can reasonably solve the task.

Do not perform broad dependency upgrades as part of an unrelated task.

## Deployment

Do not deploy to production automatically while the project is in SUPERVISED MODE.

Before deployment:

1. Summarize the changes.
2. Report validation results.
3. Identify risks.
4. Wait for explicit user approval.

## Scope discipline

Do not turn a small request into a broad rewrite.

Prefer the smallest reliable change that solves the requested problem.

Do not redesign working systems unless requested.

## Communication

When completing a task, report:

- What was inspected
- What was changed
- Which files were changed
- What validation was performed
- Any remaining risks or manual steps

If important information is missing, say so instead of guessing.