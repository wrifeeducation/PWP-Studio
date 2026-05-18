---
name: wrife-auth-sweep
description: >
  Run a post-work authentication sweep across all WriFe apps and Edge Functions.
  Use after ANY major work — deploying Edge Functions, changing auth code, updating
  the Supabase client, adding CORS headers, modifying service worker config, changing
  login page logic, or any Supabase schema migration that touches pupils, classes,
  or auth users. Triggers on: "check auth is working", "validate the login", "test
  auth after deploy", "did I break login?", "run the auth sweep", "post-deploy check",
  "make sure login still works", or at the end of any session where auth-related
  files were modified. Always run before closing a session that touched Edge Functions,
  LoginPage.tsx, PupilLogin.tsx, supabase.ts, vite.config.ts (PWA/workbox), or any
  CORS header.
---

# WriFe Auth Sweep

Run this after any major work on Edge Functions, login pages, the Supabase client,
or service worker configuration. It catches the three classes of auth bug that have
bitten WriFe in production.

---

## The Three Auth Bug Classes

These are the real failures that have occurred on the WriFe platform:

| Class | What breaks | Root cause |
|---|---|---|
| **Request body mismatch** | Edge Function returns 401/400 even with correct credentials | Field names in JS don't match what the function expects (e.g. `classCode` vs `class_code`) |
| **Response path mismatch** | `setSession()` silently fails, user stays on login page | SDK reads tokens from wrong depth (e.g. `data.access_token` when they're at `data.session.access_token`) |
| **CORS preflight failure** | "Failed to fetch" / "Could not connect" — network error, never reaches server | `Access-Control-Allow-Headers` missing `apikey` or `x-client-info`, which the Supabase JS SDK always sends |

The sweep below catches all three.

---

## Step 1 — CORS Header Audit

Run this bash command across all three repos to check every Edge Function's
`Access-Control-Allow-Headers` value:

```bash
grep -rn "Access-Control-Allow-Headers" \
  /path/to/wrife-website/supabase/functions/ \
  /path/to/wrifeapp/supabase/functions/ \
  /path/to/wrife-dwp/supabase/functions/ \
  2>/dev/null
```

**Every function must include all four of these headers:**
```
authorization, x-client-info, apikey, content-type
```

If any function only has `authorization, content-type` — it is broken. The Supabase
JS SDK sends `apikey` on every `functions.invoke()` call. Without `apikey` in the
allowed list, the CORS preflight fails and the browser blocks the request before it
ever reaches the function, producing `TypeError: Failed to fetch`.

**The correct `corsHeaders()` pattern for every WriFe Edge Function:**
```typescript
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }
}
```

Fix any non-conforming functions by redeploying via the Supabase MCP
`deploy_edge_function` tool on project `gzmgjkbtsvezfclmreru`.

---

## Step 2 — Request Body Field Name Check

For every login page or Edge Function call that was touched, verify that:

1. The **JS field names** in the `functions.invoke()` body match **exactly** what
   the Edge Function destructures from `req.json()`.
2. Both use **snake_case** — the Supabase convention.

Check the `pupil-login` call pattern:
```typescript
// ✅ Correct — matches Edge Function's interface LoginBody
await supabase.functions.invoke('pupil-login', {
  body: {
    class_code: classCode.trim().toUpperCase(),   // snake_case
    username: pupilUsername.trim().toLowerCase(),
    pin: pin.trim(),
  },
})

// ❌ Wrong — camelCase field silently ignored, returns 401
await supabase.functions.invoke('pupil-login', {
  body: { classCode, username, pin }   // camelCase fails silently
})
```

If you modified any Edge Function's `interface`/body destructuring, cross-check the
corresponding client-side call in `LoginPage.tsx` (PWP) or `PupilLogin.tsx` (IP).

---

## Step 3 — Response Path Check

For every `functions.invoke()` call that reads session tokens, verify the response
is destructured at the correct depth.

The `pupil-login` Edge Function response shape:
```json
{
  "session": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_at": 1234567890,
    "expires_in": 3600,
    "token_type": "bearer"
  },
  "pupil": { "id": "...", "display_name": "...", ... }
}
```

```typescript
// ✅ Correct
const { data, error } = await supabase.functions.invoke('pupil-login', { body: {...} })
await supabase.auth.setSession({
  access_token: data.session.access_token,    // nested under 'session'
  refresh_token: data.session.refresh_token,
})

// ❌ Wrong — reads undefined, setSession silently fails, user stuck on login page
await supabase.auth.setSession({
  access_token: data.access_token,            // top-level — doesn't exist
  refresh_token: data.refresh_token,
})
```

---

## Step 4 — Service Worker Check (PWA apps)

If `vite.config.ts` was modified, or if login started failing with "Failed to fetch"
despite the Edge Function working when called directly, check the Workbox config.

The PWA service worker intercepts **all** fetch events including cross-origin calls
to `supabase.co`. If a function URL has no matching `runtimeCaching` route, Workbox
may fail the request in some configurations.

**Required: add a `NetworkOnly` rule for Edge Functions** in `vite.config.ts`:

```typescript
VitePWA({
  workbox: {
    runtimeCaching: [
      // Edge Functions — NetworkOnly (never cache, never intercept)
      {
        urlPattern: /^https:\/\/gzmgjkbtsvezfclmreru\.supabase\.co\/functions\/.*/i,
        handler: 'NetworkOnly',
      },
      // Auth endpoints — NetworkOnly
      {
        urlPattern: /^https:\/\/gzmgjkbtsvezfclmreru\.supabase\.co\/auth\/.*/i,
        handler: 'NetworkOnly',
      },
      // REST API — NetworkFirst (existing rule)
      {
        urlPattern: /^https:\/\/gzmgjkbtsvezfclmreru\.supabase\.co\/rest\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-rest-cache',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})
```

**Diagnostic test** — if you suspect SW interference, run this in the browser console
on the affected app and reload:
```javascript
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => r.unregister()))
```
If login then works, the service worker is the culprit and the `runtimeCaching` fix above is needed.

---

## Step 5 — Live Login Test

Test Route B (direct sub-app login) using the saved test credentials:

| App | URL | Credentials |
|---|---|---|
| **PWP Studio** | `https://pwp-studio.wrife.co.uk/login?role=pupil` | SIL42495 / amab04 / 9543 |
| **Interactive Practice** | `https://practice.wrife.co.uk/login` | SIL42495 / amab04 / 9543 |

Use the Claude in Chrome MCP to navigate and submit the form. A successful login
redirects to `/dashboard` (PWP) or `/world-map` (IP). Any error on the login page
means one of the three bug classes above is still present.

**Quick browser-console test** — call the Edge Function directly to confirm it's
reachable before blaming the app code:
```javascript
fetch('https://gzmgjkbtsvezfclmreru.supabase.co/functions/v1/pupil-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <anon-key>',
  },
  body: JSON.stringify({ class_code: 'SIL42495', username: 'amab04', pin: '9543' })
}).then(r => r.json()).then(console.log)
```
- HTTP 200 with `{ session: {...}, pupil: {...} }` → Edge Function is working ✅
- HTTP 401 → credentials wrong or field name mismatch ❌
- `TypeError: Failed to fetch` → CORS issue or network error ❌

---

## Step 6 — Check Local Source Files Match Deployed Versions

After deploying any Edge Function via the Supabase MCP, update the local source file
in `wrife-dwp/supabase/functions/<name>/index.ts` to match. The deployed version and
the local source can diverge if only one is updated — future Claude sessions will
read the local file and be confused about what's actually running.

Check deployed version numbers with:
```
mcp tool: get_edge_function  project_id: gzmgjkbtsvezfclmreru  slug: pupil-login
```

---

## Pass Criteria

The sweep is complete when all of the following are true:

- [ ] Every Edge Function in `wrife-dwp/supabase/functions/` has `apikey` in its `Access-Control-Allow-Headers`
- [ ] `LoginPage.tsx` (PWP) sends `class_code` (snake_case) and reads `data.session.access_token`
- [ ] `PupilLogin.tsx` (IP) sends `class_code` (snake_case) and reads `data.session.access_token`
- [ ] `vite.config.ts` workbox config has `NetworkOnly` rules for `/functions/` and `/auth/` endpoints
- [ ] Live login test with SIL42495 / amab04 / 9543 succeeds on at least one app
- [ ] Local source files updated to match deployed Edge Function versions

---

## When to Run This Skill

Run immediately after any of the following:

- Deploying or modifying any Edge Function
- Changing `LoginPage.tsx`, `PupilLogin.tsx`, or any auth page
- Updating `@supabase/supabase-js` version
- Modifying `vite.config.ts` (especially the PWA / workbox section)
- Adding a new Supabase client configuration option
- Running any migration that touches `pupils`, `classes`, `class_members`, or `auth` tables
- After a Supabase project restore (paused → active)
