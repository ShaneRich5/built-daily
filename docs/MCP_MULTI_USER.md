# Built Daily — MCP server: from single-user to multi-user

This is a reference/implementation guide for turning the current MCP server
(scoped to one hardcoded Firebase uid) into one that other Built Daily users
can connect to Claude with their own data. It's written to be followed
step-by-step the first time through, and used as a lookup later.

**Status:** not yet implemented. This document describes the plan and the
concepts involved; see [Implementation checklist](#implementation-checklist)
for what to actually change.

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

## Implementation checklist

- [ ] Add `mcpTokens/{tokenHash}` collection + Firestore rules (deny client access)
- [ ] Token issuance UI + server action in account settings
- [ ] Token list/revoke UI
- [ ] `mcp/bearer.ts`: verifier does Firestore lookup, returns uid via `AuthInfo`
- [ ] `mcp/firestore.ts`: `uid` becomes a parameter, not read from env
- [ ] `mcp/create-server.ts`: accept uid, thread into tool handlers
- [ ] `app/api/mcp/route.ts`: build/parameterize server per-request using the authenticated uid
- [ ] Decide fate of `MCP_BEARER_TOKEN` / `MCP_USER_UID` (keep for local dev only, or remove)
- [ ] Write end-user "connect to Claude" doc once shipped
- [ ] (Optional) basic rate limiting per token

---

## Open questions to resolve before/while implementing

- What does the installed `@modelcontextprotocol/server` version actually
  expose on `AuthInfo` for carrying custom data (the uid) from the verifier
  to the request handler? Check the installed package's types directly
  (`node_modules/@modelcontextprotocol/server`) since this determines the
  exact shape of the change in step 3.
- Do tokens need scopes/expiry, or is "valid until revoked" fine for v1?
  Given this is read-only personal data, indefinite tokens with easy
  revocation is a reasonable starting point.
