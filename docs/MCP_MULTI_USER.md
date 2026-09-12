# Built Daily — MCP server: from single-user to multi-user

This is a reference/implementation guide for turning the MCP server (once
scoped to one hardcoded Firebase uid) into one that other Built Daily users
can connect to Claude with their own data.

**Status: implemented** via personal access tokens (PATs). The sections
below describe the design; see [What actually shipped](#what-actually-shipped)
for the final file list and how to use it.

---

## Current state (single-user)

| File | Role today |
|------|------------|
| [`mcp/server.ts`](../mcp/server.ts) | Local stdio MCP entrypoint, started by Cursor via [`.cursor/mcp.json`](../.cursor/mcp.json). Read-only, personal use. |
| [`mcp/env.ts`](../mcp/env.ts) | Loads `.env.local`/`.env`. `getMcpUserUid()` reads `MCP_USER_UID` — **one uid, hardcoded per process**. |
| [`mcp/create-server.ts`](../mcp/create-server.ts) | Builds the `McpServer` and registers tools (`list_recent_sessions`, `get_session`, `search_exercises`). Tools call Firestore helpers with no uid argument — they all silently use `getMcpUserUid()`. |
| [`mcp/firestore.ts`](../mcp/firestore.ts) | Firestore Admin SDK access. `listRecentCompletedSessions` / `getSessionById` both call `getMcpUserUid()` internally. |
| [`mcp/bearer.ts`](../mcp/bearer.ts) | HTTP auth for the remote endpoint. `mcpTokenVerifier.verifyAccessToken` compares the incoming token against **one shared secret**, `MCP_BEARER_TOKEN`. Doesn't identify *who* is calling — just whether they know the one password. |
| [`app/api/mcp/route.ts`](../app/api/mcp/route.ts) | Next.js route exposing the server over Streamable HTTP, gated by `requireBearerAuth`. This is the endpoint a remote Claude connector talks to. |

The problem in one sentence: **the token proves you're allowed in, but every
token that gets in sees the same uid's data**, because the uid comes from an
env var, not from who authenticated.

---

## Target state (multi-user)

Two things change together:

1. **Tokens become per-user**, not one shared secret.
2. **The uid is derived from the authenticated token**, not from
   `MCP_USER_UID`.

Everything else (the tools, the Firestore query shapes, the read-only
contract) stays the same.

### Chosen approach: personal access tokens (PATs)

This mirrors how GitHub/Vercel/Linear let you generate an API token in
account settings and paste it into a third-party tool. It's the natural fit
here because:

- The app already has Firebase Auth + Firestore — no new identity system.
- It reuses the existing bearer-token code path in `bearer.ts` almost as-is.
- It matches [CLAUDE.md](../CLAUDE.md)'s "reduce friction, keep it
  maintainable" guidance — no new auth server to build or operate.

**Alternative considered:** full OAuth 2.1 against Firebase Auth (user
clicks "Connect" in Claude, logs in with their existing account, no token to
copy/paste). This is the more "standard" flow for public MCP connectors and
is worth revisiting if this ever needs to support many non-technical users
at scale — but it means implementing `/authorize` + `/token` endpoints, PKCE,
and consent, which is a lot of new surface area for what's currently a
read-only personal-data tool. Not chosen for the first version.

Background reading:
- MCP authorization spec: https://modelcontextprotocol.io/specification/draft/basic/authorization
- MCP TypeScript SDK (what `@modelcontextprotocol/server` is built on): https://github.com/modelcontextprotocol/typescript-sdk
- Claude custom connectors (how end users add a remote MCP server in Claude): https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp
- Firebase Admin SDK auth (service accounts / `applicationDefault()`): https://firebase.google.com/docs/admin/setup

---

## Data model addition

New top-level Firestore collection, sibling to `users/` (see
[`DATA_MODEL.md`](./DATA_MODEL.md) for the rest of the schema):

```
mcpTokens/{tokenHash}
  uid: string            // Firebase Auth uid this token belongs to
  label: string | null   // user-supplied name, e.g. "Claude Desktop"
  createdAt: Timestamp
  lastUsedAt: Timestamp | null
```

Key design points:

- **Document ID is the hash, not the raw token.** Store `sha256(token)` as
  the doc ID (or a field, if you want to query by uid too — see below). This
  is the same principle as never storing plaintext passwords: if Firestore
  is ever read by the wrong party, no usable tokens leak.
- **The raw token is shown to the user exactly once**, at creation time, in
  the browser. After that, only the hash exists server-side. If they lose
  it, they generate a new one and revoke the old one.
- If you also want "list my tokens" in account settings, add a
  `users/{uid}/mcpTokenRefs/{tokenHash}` doc (id/label/createdAt only, no
  need to duplicate uid) so you can list a user's tokens without a
  collection-group query across `mcpTokens`.

Firestore security rules: `mcpTokens/*` should **not** be readable/writable
from client SDKs at all — only the Admin SDK (server-side: the token-issuing
route action, and the MCP route's verifier) touches this collection. Deny-all
in `firestore.rules` for this path.

---

## Step-by-step implementation

### 1. Token issuance UI (in the Next.js app, not the MCP server)

Add a section to account/profile settings, e.g. "Connect to Claude" or
"Developer access":

- Button: "Generate new token".
- Server action (or route handler) that:
  1. Confirms the caller is authenticated (existing Firebase Auth session).
  2. Generates a random token: `crypto.randomBytes(32).toString("base64url")`
     is enough entropy. Prefix it for recognizability, e.g. `bd_live_<token>`
     (same pattern Stripe/GitHub use — makes leaked-token scanning easier
     too).
  3. Hashes it (`crypto.createHash("sha256").update(token).digest("hex")`).
  4. Writes `mcpTokens/{hash}` with `{ uid, label, createdAt: serverTimestamp(), lastUsedAt: null }`.
  5. Returns the **raw token** in the response — this is the only time it
     ever leaves the server.
- UI shows the raw token once in a copy-to-clipboard box with a "you won't
  see this again" warning, same UX pattern as API key generators elsewhere.
- A "revoke" button per listed token deletes the `mcpTokens/{hash}` doc (and
  its `mcpTokenRefs` mirror if you added one). Revocation is instant since
  the verifier does a live Firestore lookup on every request.

### 2. Update the verifier (`mcp/bearer.ts`)

Replace the shared-secret comparison in `mcpTokenVerifier.verifyAccessToken`
with a Firestore lookup:

- Hash the incoming token the same way as issuance.
- `firestore.collection("mcpTokens").doc(hash).get()`.
- Not found → throw `OAuthError(OAuthErrorCode.InvalidToken, ...)` (same as
  today's invalid-token path).
- Found → return an `AuthInfo` that carries the uid forward. Check what the
  installed version of `@modelcontextprotocol/server` supports for custom
  fields on `AuthInfo` (commonly an `extra` bag) — that's how the uid gets
  from "the token was valid" to "here's whose data to read."
- Optionally fire-and-forget update `lastUsedAt` — don't `await` it on the
  hot path, and don't fail the request if it errors.
- Keep `isMcpAuthConfigured()` / `MCP_BEARER_TOKEN` around as an escape hatch
  for your own personal/admin testing if useful, or remove it once PATs are
  in place — your call once this is working.

### 3. Thread the uid through instead of reading env (`mcp/create-server.ts`, `mcp/firestore.ts`)

This is the actual "single-tenant → multi-tenant" change:

- `mcp/firestore.ts`: change `listRecentCompletedSessions(limit)` and
  `getSessionById(sessionId)` to take `uid` as a parameter instead of calling
  `getMcpUserUid()` internally.
- `mcp/create-server.ts`: change `createBuiltDailyServer()` to accept the
  uid (or a small context object) and pass it into the Firestore calls
  inside each tool handler.
- `app/api/mcp/route.ts`: `createMcpHandler(() => createBuiltDailyServer())`
  currently builds one server instance with no per-request identity. This
  needs to become per-request: pull the uid out of the `AuthInfo` that
  `requireBearerAuth` already attaches (it's already passed as
  `{ authInfo: auth }` into `handler.fetch` at line 59) and build/parameterize
  the server with that uid for that request.
- Leave `mcp/server.ts` (the local stdio entrypoint used by Cursor) as-is —
  it's not exposed to other users, so `MCP_USER_UID` from `.env.local`
  continues to work fine for your own local/advanced testing.

### 4. Rate limiting (optional for v1, worth flagging)

Once tokens aren't just yours, a buggy or malicious client could hammer the
endpoint. Cheap options, roughly in order of effort:
- Skip for v1 — it's read-only and scoped per-user, so the blast radius of
  abuse is "one user's own Firestore reads run up," not a cross-user leak.
- A simple per-token counter doc with a rolling window, checked before
  hitting Firestore for the real query.
- Vercel/hosting-platform-level rate limiting if deploying on a platform
  that supports it out of the box.

### 5. End-user documentation

Once shipped, users need a short guide (separate doc or a help-center page,
not this file) covering:
1. Generate a token in Built Daily settings.
2. In Claude, add a custom connector with URL `https://<your-domain>/api/mcp`.
3. Paste the token as the API key (the route already accepts `x-api-key`
   and copies it into `Authorization: Bearer` — see
   `requestWithBearerToken` in [`mcp/bearer.ts`](../mcp/bearer.ts)).

---

## What actually shipped

| File | Role |
|------|------|
| [`lib/firebase-admin.ts`](../lib/firebase-admin.ts) | New. Single shared Admin SDK init (`getAdminFirestore()`, `getAdminAuth()`, `isFirebaseAdminConfigured()`) — used by both the MCP route and the token API route. Replaces the admin-init code that used to live directly in `mcp/firestore.ts`. |
| [`mcp/tokens.ts`](../mcp/tokens.ts) | New. All `mcpTokens/{tokenHash}` reads/writes: `createMcpTokenForUid`, `listMcpTokensForUid`, `revokeMcpToken`, `resolveUidForToken`. Tokens are prefixed `bd_live_` and stored as a SHA-256 hash (doc ID), never in plaintext. |
| [`mcp/bearer.ts`](../mcp/bearer.ts) | Rewritten. `mcpTokenVerifier` now calls `resolveUidForToken` and returns the uid via `AuthInfo.extra.uid`. Falls back to the old single-shared-secret path (`MCP_BEARER_TOKEN` + `MCP_USER_UID`) only if the Firestore lookup misses — kept as a maintainer escape hatch, not used by real users. New export `uidFromAuthInfo()` reads the uid back out. |
| [`mcp/firestore.ts`](../mcp/firestore.ts) | `listRecentCompletedSessions(uid, limit)` and `getSessionById(uid, sessionId)` now take `uid` as a parameter instead of calling `getMcpUserUid()`. Uses `getAdminFirestore()` from the shared module. |
| [`mcp/create-server.ts`](../mcp/create-server.ts) | `createBuiltDailyServer(uid)` now takes the uid and threads it into both Firestore-backed tools. `search_exercises` is unaffected (it's catalog-only, no Firestore). |
| [`mcp/server.ts`](../mcp/server.ts) | Local stdio entrypoint (Cursor) unchanged in spirit — now explicitly calls `createBuiltDailyServer(getMcpUserUid())`, so your own `.env.local` workflow is untouched. |
| [`app/api/mcp/route.ts`](../app/api/mcp/route.ts) | `createMcpHandler` now uses a per-request factory: `(ctx) => createBuiltDailyServer(uidFromAuthInfo(ctx.authInfo))`. The 503 "not configured" guard now checks `isFirebaseAdminConfigured()` instead of the old `MCP_BEARER_TOKEN`-only check (so it no longer 503s for every real user just because you didn't set a shared secret). |
| [`app/api/mcp/tokens/route.ts`](../app/api/mcp/tokens/route.ts) | New. `GET`/`POST`/`DELETE` for a signed-in user's own tokens. Auth here is a normal Firebase **ID token** (`Authorization: Bearer <idToken>`, verified with `getAdminAuth().verifyIdToken`) — different from the MCP endpoint's long-lived PAT, and easy to mix up: this route authenticates *app users*, `/api/mcp` authenticates *MCP clients*. |
| [`lib/mcp-token-repository.ts`](../lib/mcp-token-repository.ts) | New. Client-side wrapper (`listMcpTokens`, `createMcpToken`, `revokeMcpToken`) that attaches the current Firebase user's ID token to calls against `/api/mcp/tokens`. |
| [`components/settings-mcp-tokens.tsx`](../components/settings-mcp-tokens.tsx) | New. "Connect to Claude" settings section: generate a labeled token (shown once, copy-to-clipboard), list existing tokens with created/last-used dates, revoke. Wired into [`app/settings/page.tsx`](../app/settings/page.tsx) alongside the existing public-profile settings. |
| [`firestore.rules`](../firestore.rules) | Comment added noting `mcpTokens/*` is deliberately unmatched (default-denied to client SDKs) — Admin SDK only. |

### How a user connects (end-user flow)

1. Sign in to Built Daily, go to **Settings → Connect to Claude**.
2. Enter a label (e.g. "Claude Desktop") and click **Generate token**. Copy
   the token shown — it is never shown again.
3. In Claude, add a custom connector with URL `https://<your-domain>/api/mcp`
   and paste the token as the API key. Claude sends it as `x-api-key`, which
   `requestWithBearerToken` in `mcp/bearer.ts` copies into
   `Authorization: Bearer` before the SDK's `requireBearerAuth` gate runs.
4. Revoke anytime from the same settings section — revocation is immediate
   because the verifier does a live Firestore lookup per request (no caching).

### Notes / things to revisit later

- **Local/legacy fallback:** `MCP_BEARER_TOKEN` + `MCP_USER_UID` still work
  as a single hardcoded identity for your own testing, checked only after
  the Firestore lookup misses. Fine to delete once you're comfortable
  generating your own PAT through the UI instead.
- **Rate limiting:** not implemented. Left out per the original plan — it's
  read-only and scoped per-user, so abuse blast radius is limited to one
  user's own Firestore reads. Revisit if this becomes a real concern.
- **AuthInfo shape:** confirmed against the installed
  `@modelcontextprotocol/server`/`sdk` types — `AuthInfo.extra` is a
  `Record<string, unknown>` bag, and `McpServerFactory` is
  `(ctx: McpRequestContext) => McpServer`, where `ctx.authInfo` is the
  pass-through value set by `requireBearerAuth`. That's what
  `uidFromAuthInfo()` and the route's factory rely on.
