# Security Best Practices Report

## Executive Summary

Overall posture: weak for a production app that stores lead/customer data.

The biggest problems are authorization and data-boundary design, not just missing hardening:

- The report unlock flow is vulnerable to broken object-level authorization. With only an `auditId`, the server can upgrade a report to full access, overwrite the stored email, and send the full report to an arbitrary recipient.
- Sensitive Supabase operations are performed directly from the browser with the public anon key, including admin reads and deletes. If production RLS is permissive enough for these flows to work, the exposure is severe.

I also found weaker but still important issues around secret reuse for auth token signing, incomplete SSRF protection in the website analysis pipeline, and missing visible CSP/security-header hardening.

## Critical Findings

### SBP-001
- Rule ID: NEXT-AUTHZ-001
- Severity: Critical
- Location:
  - `src/app/api/send-unlock-email/route.ts:18`
  - `src/app/api/send-unlock-email/route.ts:26`
  - `src/app/api/send-unlock-email/route.ts:50`
  - `src/app/api/send-unlock-email/route.ts:63`
  - `src/app/results/page.tsx:2463`
  - `src/app/results/page.tsx:2473`
  - `src/app/results/page.tsx:2684`
  - `src/app/results/page.tsx:2713`
- Evidence:
  - `send-unlock-email` accepts only `{ email, auditId }`.
  - It loads the audit by ID alone, then updates the stored email and persists a full report:
    - `const auditId = ...`
    - `.from('audits').select('company, email, answers, result').eq('id', auditId).single()`
    - `.update({ email: targetEmail, result: auditResult }).eq('id', auditId)`
    - `.update({ email: targetEmail }).eq('id', auditId)`
  - The results page posts only that `email` + `auditId` pair:
    - `body: JSON.stringify({ email, auditId })`
  - The results page then treats any non-preview stored report as unlocked:
    - `setUnlocked(nextAudit.report_stage !== 'preview' || storedUnlock)`
  - The results page also fetches report content, company, name, email, and answers by ID:
    - `.select('result, company, name, email, answers').eq('id', id).single()`
- Impact:
  - Anyone who learns an `auditId` can redirect the full report to their own email and overwrite the audit's stored email address.
  - Once a report is upgraded to `full`, anyone holding the report URL can view the unlocked content if the browser query succeeds.
  - This exposes PII and business-sensitive audit data.
- Fix:
  - Replace `auditId`-only unlock with a server-minted, single-use, signed unlock token bound to the audit and recipient.
  - Do not update the canonical audit email from an unauthenticated request.
  - Keep preview/full access behind server-side authorization, not a shared DB flag plus client logic.
- Mitigation:
  - As an immediate containment step, send unlock links only to the original stored email and remove the unauthenticated email-change path.
  - Consider expiring existing public result URLs once a stronger access model is introduced.
- False positive notes:
  - This is less severe only if `auditId` values never leave a trusted channel and browser reads of `audits` are blocked by RLS. The current UI assumes both behaviors are allowed.

## High Findings

### SBP-002
- Rule ID: NEXT-SECRETS-002 / NEXT-AUTHZ-002
- Severity: High
- Location:
  - `src/lib/supabase.ts:3`
  - `src/lib/supabase.ts:9`
  - `src/app/admin/page.tsx:195`
  - `src/app/admin/page.tsx:197`
  - `src/app/admin/data/page.tsx:437`
  - `src/app/admin/data/page.tsx:440`
  - `src/app/admin/data/page.tsx:505`
  - `src/app/admin/data/page.tsx:537`
  - `src/app/results/page.tsx:2713`
  - `src/app/components/ChatWidget.tsx:101`
  - `src/app/components/ChatWidget.tsx:141`
  - `src/app/components/ChatWidget.tsx:187`
  - `src/app/components/ChatWidget.tsx:221`
- Evidence:
  - A single shared client is created with `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
    - `const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)`
  - The admin UI reads sensitive audit records directly from the browser:
    - `.from('audits').select('id, created_at, name, email, company, answers, result')`
  - The admin data UI loads all rows from sensitive tables and performs deletes directly from the browser:
    - `.from('audits').delete({ count: 'exact' }).lt('created_at', cutoff)`
    - `supabase.from('audits').select('*')`
    - `supabase.from('chat_conversations').select('*')`
    - `supabase.from('build_requests').select('*')`
    - `await supabase.from(table).delete().eq('id', id)`
  - The public results page and chat widget also read/write audit and chat data directly from the browser.
- Impact:
  - If these browser flows work in production, RLS must allow anonymous read/write/delete access to sensitive tables or equivalent overly-broad access. An attacker can then bypass the Next.js app entirely and call Supabase directly with the public anon key.
  - If RLS blocks it, the current app design is broken rather than secure.
- Fix:
  - Move sensitive table access to server-only route handlers.
  - Use a server-side Supabase client for privileged reads/writes and keep the service-role key server-only.
  - Lock all sensitive tables behind explicit RLS policies tied to authenticated principals or signed server-issued capabilities.
- Mitigation:
  - Immediately review and tighten RLS for `audits`, `chat_conversations`, `build_requests`, `audit_sessions`, and `audit_events`.
  - Remove browser-side delete operations from admin pages first.
- False positive notes:
  - I could not inspect Supabase RLS policies from this repo. Verify deployed policies. If the current UI works as written with anon access, this is close to a critical exposure.

## Medium Findings

### SBP-003
- Rule ID: NEXT-SESSIONS-001
- Severity: Medium
- Location:
  - `src/lib/admin-session.ts:12`
  - `src/lib/admin-session.ts:14`
  - `src/lib/admin-session.ts:15`
  - `src/lib/admin-session.ts:16`
  - `src/lib/chat-history-auth.ts:26`
  - `src/lib/chat-history-auth.ts:28`
  - `src/lib/chat-history-auth.ts:29`
  - `src/lib/chat-history-auth.ts:30`
  - `src/lib/chat-history-auth.ts:31`
- Evidence:
  - Admin sessions are signed with a fallback chain of:
    - `ADMIN_SESSION_SECRET || ADMIN_PASSWORD || OPENAI_API_KEY`
  - Chat-history access/session tokens are signed with:
    - `CHAT_HISTORY_AUTH_SECRET || ADMIN_PASSWORD || OPENAI_API_KEY || RESEND_API_KEY`
- Impact:
  - Authentication integrity depends on unrelated operational secrets. If any one of those secrets leaks, the attacker may be able to mint valid session tokens.
  - Secret rotation for unrelated services can also invalidate sessions unexpectedly.
- Fix:
  - Require dedicated random secrets for each auth boundary and fail fast if they are absent.
  - Use independent secrets for admin sessions and chat-history tokens.
- Mitigation:
  - Rotate any secret that has ever been reused as a token-signing key after migration.
- False positive notes:
  - This is still poor practice even if those fallback secrets are currently well protected.

### SBP-004
- Rule ID: NEXT-SSRF-001
- Severity: Medium
- Location:
  - `src/lib/website-intel.ts:287`
  - `src/lib/website-intel.ts:302`
  - `src/lib/website-intel.ts:394`
  - `src/lib/website-intel.ts:402`
  - `src/lib/website-intel.ts:417`
  - `src/lib/website-visual-intel.ts:23`
  - `src/lib/website-visual-intel.ts:131`
  - `src/lib/website-visual-intel.ts:152`
- Evidence:
  - URL validation only blocks obvious hostnames/IP literals such as `localhost`, `.local`, `::1`, and private IPv4 text.
  - The fetch path follows redirects before validating the final URL:
    - `fetch(requestedUrl, { redirect: 'follow', ... })`
    - `const finalUrl = normalizeWebsiteUrlInput(response.url || requestedUrl)`
  - There is no DNS resolution or IP-range verification of the resolved host before the network request is made.
  - Screenshot analysis also hands the normalized target URL to a third-party fetcher:
    - `WEBSITE_SCREENSHOT_BASE_URL || 'https://image.thum.io/get'`
    - `return \`${SCREENSHOT_BASE_URL}/.../${normalized}\``
- Impact:
  - A controlled domain or redirect chain may still reach internal/private infrastructure despite the string-based hostname filter.
  - The screenshot service introduces an additional outbound fetch path that can be abused against arbitrary targets.
- Fix:
  - Resolve hostnames and reject private/link-local/reserved ranges before each outbound request.
  - Re-validate every redirect hop, not just the final URL string.
  - Consider an outbound proxy or fetch service that enforces SSRF rules centrally.
- Mitigation:
  - Restrict egress where possible and log rejected target resolution details for detection.
- False positive notes:
  - Platform-level egress controls may reduce exploitability, but that protection is not visible in this codebase.

## Low Findings

### SBP-005
- Rule ID: NEXT-HEADERS-001
- Severity: Low
- Location:
  - `next.config.ts:7`
  - `next.config.ts:9`
- Evidence:
  - No visible CSP, `frame-ancestors`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or similar baseline security headers are configured in app code.
  - The Next config only sets `outputFileTracingRoot` and `images.domains`.
- Impact:
  - The app loses defense-in-depth against XSS, clickjacking, and MIME sniffing.
  - This matters more because admin and results pages handle sensitive data.
- Fix:
  - Add a baseline header policy either in Next.js config/proxy or at the edge.
  - At minimum: CSP, `frame-ancestors` or `X-Frame-Options`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.
- Mitigation:
  - If the edge/CDN already sets these headers, document that and add a runtime verification check.
- False positive notes:
  - These headers may exist outside the repo. I did not see them in application code.

## Open Questions / Assumptions

- `src/app/admin/login/page.tsx:24` uses Supabase Auth, but `proxy.ts:46` and `src/app/api/admin-auth/route.ts:11` enforce a different custom admin-session cookie. That looks inconsistent and should be reviewed; it may indicate the admin auth model is partly broken rather than securely unified.
- I could not inspect live Supabase RLS policies, edge headers, WAF, or deployment-level egress controls from this repo alone. Those runtime controls may reduce or increase actual exposure.

## Recommended Priority Order

1. Fix the `send-unlock-email` authorization model and stop unauthenticated email mutation.
2. Move sensitive Supabase access off the client and review/lock RLS immediately.
3. Replace fallback auth-signing secrets with dedicated secrets.
4. Harden the website-intel fetch pipeline against SSRF.
5. Add baseline security headers/CSP.
