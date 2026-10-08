# Built Daily — ChatGPT MCP connector (OAuth 2.1 + Dynamic Client Registration)

Companion to [`MCP_MULTI_USER.md`](./MCP_MULTI_USER.md), which covers Claude
(personal access tokens). This document covers ChatGPT support, which needs a
materially different auth mechanism.

**Status: implemented.** The sections below are the original design; see
[What actually shipped](#what-actually-shipped) for the final file list and
where the build diverged from the plan.

---

## Why this can't reuse the Claude approach

Claude's custom connector UI has a field where you paste an API key/bearer
token — that's exactly what the [PAT system](./MCP_MULTI_USER.md) plugs
into.

ChatGPT's connector UI (Developer Mode / custom connectors) has **no
equivalent field**. It only supports OAuth: when you add a connector,
ChatGPT expects to run a full OAuth 2.1 authorization-code flow with PKCE,
including registering itself as a client on the fly via **Dynamic Client
Registration** (RFC 7591) the first time it connects. There is currently no
way to hand ChatGPT a static token the way Claude accepts one.

Practically, this means "ChatGPT support" = building a small OAuth
**authorization server** in front of the MCP **resource server** you already
have. The resource-server half (verifying a bearer token → uid → serving
tools) is already done in [`mcp/bearer.ts`](../mcp/bearer.ts) and
[`mcp/tokens.ts`](../mcp/tokens.ts); what's missing is everything that issues
a token to ChatGPT in the first place.

Background reading:
- MCP authorization spec (the DCR + PKCE flow this whole doc implements): https://modelcontextprotocol.io/specification/draft/basic/authorization
- OpenAI: building MCP servers / connectors: https://developers.openai.com/api/docs/mcp
- OpenAI: MCP + connectors guide: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- RFC 7591 (Dynamic Client Registration): https://www.rfc-editor.org/rfc/rfc7591
- RFC 8414 (Authorization Server Metadata) / RFC 9728 (Protected Resource Metadata) — the `.well-known` discovery documents ChatGPT reads

---

## Flow overview

```
ChatGPT                              Built Daily
   |                                      |
   |--- GET /api/mcp (no token) --------->|
   |<-- 401 + WWW-Authenticate: Bearer ---|   points at protected-resource metadata
   |     resource_metadata="..."          |
   |                                      |
   |--- GET /.well-known/                 |
   |     oauth-protected-resource ------->|   lists the authorization server
   |<-------------------------------------|
   |                                      |
   |--- GET /.well-known/                 |
   |     oauth-authorization-server ----->|   lists authorize/token/register endpoints
   |<-------------------------------------|
   |                                      |
   |--- POST /oauth/register (DCR) ------>|   ChatGPT self-registers, gets client_id
   |<-------------------------------------|
   |                                      |
   |--- browser: GET /oauth/authorize --->|   user logs in (existing Firebase Auth),
   |         (code_challenge, PKCE)       |   approves a consent screen
   |<-- redirect w/ ?code=... ------------|
   |                                      |
   |--- POST /oauth/token --------------->|   exchanges code (+ verifier) for a token
   |<-- { access_token, refresh_token } --|
   |                                      |
   |--- GET/POST /api/mcp ---------------->|  Authorization: Bearer <access_token>
   |<-- tool results (scoped to uid) ----|
```

The last leg — token in, uid out, tools served — is **already built**. This
doc is entirely about the first five arrows.

---

## Data model additions

Three new Firestore collections, all Admin-SDK-only (same pattern as
`mcpTokens` — see [`firestore.rules`](../firestore.rules)):

```
oauthClients/{clientId}
  clientName: string          // from DCR request, shown on consent screen
  redirectUris: string[]      // registered callback URLs, validated exactly on /authorize and /token
  createdAt: Timestamp

oauthCodes/{code}             // one-time authorization codes, short TTL (~60s)
  uid: string
  clientId: string
  redirectUri: string
  codeChallenge: string       // PKCE S256 challenge from the /authorize request
  createdAt: Timestamp
  // deleted immediately on redemption (single use)

oauthRefreshTokens/{tokenHash}
  uid: string
  clientId: string
  createdAt: Timestamp
  // rotated (deleted + reissued) on every use, same as access tokens below
```

**Access tokens** don't need a fourth collection — extend the existing
`mcpTokens/{tokenHash}` shape (from `MCP_MULTI_USER.md`) with two optional
fields:

```
mcpTokens/{tokenHash}
  uid: string
  label: string | null        // PATs only; null for OAuth-issued tokens
  clientId: string | null     // OAuth-issued tokens only
  expiresAt: Timestamp | null // OAuth-issued tokens only — PATs stay non-expiring
  createdAt: Timestamp
  lastUsedAt: Timestamp | null
```

This means `mcp/bearer.ts`'s existing `resolveUidForToken` needs exactly one
change: after finding a doc, reject it if `expiresAt` is set and in the past.
Everything else in the resource-server half — `uidFromAuthInfo`,
`createBuiltDailyServer(uid)`, the Firestore tool handlers — needs **no
changes** to serve ChatGPT once a valid token exists.

---

## New endpoints to build

| Route | Method | Purpose |
|-------|--------|---------|
| `app/.well-known/oauth-protected-resource/route.ts` | GET | Static JSON: `{ resource: "<mcp endpoint URL>", authorization_servers: ["<your domain>"] }` (RFC 9728). |
| `app/.well-known/oauth-authorization-server/route.ts` | GET | Static JSON: issuer + `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, supported grant types (`authorization_code`, `refresh_token`), `code_challenge_methods_supported: ["S256"]` (RFC 8414). |
| `app/api/mcp/oauth/register/route.ts` | POST | DCR (RFC 7591). Body has `redirect_uris`, `client_name`. Validate every `redirect_uri` is `https://` (reject `http://` except localhost dev). Write `oauthClients/{clientId}`, return `{ client_id, client_name, redirect_uris }`. No client secret needed — treat as a public client using PKCE. |
| `app/connect/authorize/page.tsx` (UI) + `app/api/mcp/oauth/authorize/route.ts` (POST for the approve action) | GET renders / POST handles | The consent screen. GET: verify `client_id` exists and `redirect_uri` matches a registered one; if the visitor isn't signed in, redirect through the existing `/login` flow first. Render "Allow ChatGPT to read your Built Daily workouts?" with Approve/Deny. On approve: create `oauthCodes/{code}` (uid, clientId, redirectUri, codeChallenge from the query string, ~60s TTL) and redirect to `redirect_uri?code=...&state=...`. On deny: redirect with `?error=access_denied`. |
| `app/api/mcp/oauth/token/route.ts` | POST | Two grant types: `authorization_code` (validate PKCE `code_verifier` against the stored `codeChallenge`, consume the code, mint an access token + refresh token via the extended `mcpTokens` writer) and `refresh_token` (validate + rotate: delete old refresh token, issue new access + refresh pair). Short-lived access tokens (e.g. 1 hour) are the norm here, unlike the Claude PATs which are effectively permanent until revoked. |

The `/api/mcp` route itself needs one addition: when `requireBearerAuth`
rejects a request, its 401 response should include
`WWW-Authenticate: Bearer resource_metadata="https://<domain>/.well-known/oauth-protected-resource"`
so ChatGPT can discover the authorization server. Check whether
`requireBearerAuth` from `@modelcontextprotocol/server` already sets this
(likely, since it's part of the same SDK that implements the client side of
this spec) before hand-rolling it.

---

## Consent screen UX

Reuse the existing sign-in flow (`components/auth-provider.tsx`,
`/login`) — a visitor hitting `/connect/authorize` while signed out should
bounce through `/login?returnTo=/connect/authorize?<original query>` and
land back on the consent screen once authenticated. The consent screen
itself is a small new page: show `oauthClients/{clientId}.clientName`
("ChatGPT wants to connect to Built Daily"), an Approve/Deny button pair,
and a one-line description of what's shared (same read-only scope as the
Claude tools: recent sessions, one session by id, exercise catalog search).

---

## Security notes

- **PKCE is mandatory** (`S256` only, reject `plain`) — without a client
  secret, PKCE is the only thing binding the `/token` exchange to the
  browser session that ran `/authorize`.
- **Authorization codes are single-use and short-lived** (~60s). Delete the
  Firestore doc the moment it's redeemed; treat a second redemption attempt
  as an error (and consider revoking the resulting tokens, since a replay
  attempt is a signal of a leaked code).
- **Redirect URI must match exactly** what was registered via DCR — no
  partial/prefix matching.
- **Rotate refresh tokens on use** (delete-and-reissue, not just check-and-
  reuse) so a stolen refresh token stops working the next time the
  legitimate client refreshes.
- **Rate-limit `/oauth/register` and `/oauth/token`** — these are
  unauthenticated-until-proven-otherwise endpoints, more exposed than the
  Claude token-issuance route (which sits behind a signed-in session from
  the start).

---

## Implementation checklist

- [x] `oauthClients`, `oauthCodes`, `oauthRefreshTokens` collections (Admin-SDK-only, same as `mcpTokens`)
- [x] Extend `mcpTokens` schema with optional `clientId` / `expiresAt`; honor expiry on lookup
- [x] `.well-known/oauth-protected-resource` + `.well-known/oauth-authorization-server` metadata routes
- [x] `POST /api/mcp/oauth/register` (DCR)
- [x] `/connect/authorize` consent page + approve/deny handling, chained through existing `/login`
- [x] `POST /api/mcp/oauth/token` (`authorization_code` + `refresh_token` grants, PKCE verification, rotation)
- [x] Confirm/patch `WWW-Authenticate` header on `/api/mcp`'s 401 responses
- [ ] Manual end-to-end test against ChatGPT Developer Mode's custom connector flow
- [x] Decide token lifetimes — 1h access / 30d refresh

---

## What actually shipped

| File | Role |
|------|------|
| [`mcp/oauth-metadata.ts`](../mcp/oauth-metadata.ts) | Builds both discovery documents and owns the OAuth path constants. Protected-resource metadata comes from the SDK's `buildOAuthProtectedResourceMetadata` (which also validates the issuer is HTTPS outside loopback); authorization-server metadata is hand-built since the SDK passes it through verbatim. The issuer is the request's own origin, so a vercel.app domain and a custom domain each advertise themselves consistently. |
| [`app/.well-known/oauth-authorization-server/route.ts`](../app/.well-known/oauth-authorization-server/route.ts), [`app/.well-known/oauth-protected-resource/route.ts`](../app/.well-known/oauth-protected-resource/route.ts), [`…/[...path]/route.ts`](../app/.well-known/oauth-protected-resource/%5B...path%5D/route.ts) | The three discovery routes. The bare protected-resource path is served too, for clients that probe the origin; the `[...path]` variant serves `/api/mcp`'s RFC 9728 path and 404s any other resource. |
| [`mcp/oauth-clients.ts`](../mcp/oauth-clients.ts) + [`app/api/mcp/oauth/register/route.ts`](../app/api/mcp/oauth/register/route.ts) | DCR. Redirect URIs must be exact `https://` (loopback `http://` allowed for local testing; fragments rejected). Validation is returned as a result rather than thrown, so a bad request (400) can't be confused with a Firestore failure (500). |
| [`app/connect/authorize/page.tsx`](../app/connect/authorize/page.tsx) + [`components/oauth-consent.tsx`](../components/oauth-consent.tsx) | Consent screen. The server component validates the client, exact redirect URI, `response_type=code` and an S256 challenge before rendering; invalid requests are shown in-page and never redirected. Signed-out visitors bounce through `/login?next=…`, which round-trips only the already-validated parameters. |
| [`app/api/mcp/oauth/authorize/route.ts`](../app/api/mcp/oauth/authorize/route.ts) | Approve/deny action. Authenticated with the user's Firebase ID token and re-validates every parameter; returns `{ redirectTo }` for the browser to follow, built only on a registered redirect URI. |
| [`mcp/oauth-codes.ts`](../mcp/oauth-codes.ts) | Authorization codes: 60s TTL, stored hashed, redeemed in a transaction that deletes the doc whether or not redemption succeeds — so a failed attempt burns the code too. |
| [`app/api/mcp/oauth/token/route.ts`](../app/api/mcp/oauth/token/route.ts) | Token endpoint. Accepts form-encoded or JSON bodies; checks the code's client and redirect URI, then PKCE S256 with a constant-time compare. Responses carry `Cache-Control: no-store`. |
| [`mcp/oauth-refresh-tokens.ts`](../mcp/oauth-refresh-tokens.ts) | Refresh tokens: hashed, rotated on every use, 30-day expiry. |
| [`mcp/tokens.ts`](../mcp/tokens.ts), [`mcp/bearer.ts`](../mcp/bearer.ts) | OAuth access tokens live in `mcpTokens` alongside PATs, with a `clientId`, a 1h `expiresAt` and a `bd_oauth_` prefix. `resolveMcpToken` (renamed from `resolveUidForToken`) rejects expired tokens, and the verifier passes the real expiry to the SDK. PATs are unchanged: no expiry, `bd_live_` prefix, and the Settings list filters OAuth tokens out. |
| [`mcp/crypto.ts`](../mcp/crypto.ts), [`mcp/oauth-http.ts`](../mcp/oauth-http.ts) | Shared hashing/secret generation and CORS JSON helpers. |
| [`app/api/mcp/route.ts`](../app/api/mcp/route.ts) | The bearer gate is built per request with `resourceMetadataUrl`, so a 401 carries `WWW-Authenticate: Bearer … resource_metadata="…"` — the SDK supports this natively, no hand-rolled header needed. |

### Deviations from the original plan

- **Discovery documents use the SDK** for protected-resource metadata instead of hand-written JSON.
- **Codes are stored hashed** (`oauthCodes/{sha256(code)}`), not by raw code as sketched above — same reasoning as every other credential here.
- **The consent screen discloses write access.** The tool set grew to include `create_workout_session` and `update_workout_session` after this doc was written, so "read-only" would no longer be true.

### Verification

Run locally against the dev server with the Playwright test account: 38 scripted checks covering the full code exchange, MCP calls with the issued token, code replay, a burned code, wrong PKCE verifier, mismatched redirect URI and client, refresh rotation and reuse, access- and refresh-token expiry, `Cache-Control`, hash-only storage, and the PAT path end to end. A headless browser also drove the consent screen on a Pixel 7 viewport: signed-out redirect to `/login`, return to consent, **Allow access**, and a callback carrying a code that redeemed successfully.

### Known gaps

- **No rate limiting** on `/register` and `/token`, both of which are reachable unauthenticated.
- **No revoke UI** for OAuth grants. A connection is removed from ChatGPT's side; there's no Built Daily screen listing connected apps yet.
- **Expired documents aren't swept.** Expired codes and tokens are rejected on use but stay in Firestore until then; a Firestore TTL policy on `expiresAt` would clean them up.
- **Not yet tested against ChatGPT itself** — that needs the production deployment.
