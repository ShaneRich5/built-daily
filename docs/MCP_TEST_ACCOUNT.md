# Local MCP server for the test account

`.mcp.json` registers `built-daily-test`, a second instance of the local
stdio MCP server ([`mcp/server.ts`](../mcp/server.ts)) hardcoded to a
throwaway test account's uid, separate from whatever account you use
day-to-day.

## Why this instead of a second remote connector

A remote custom connector (see
[`MCP_MULTI_USER.md`](./MCP_MULTI_USER.md#how-a-user-connects-end-user-flow))
is one-per-URL in claude.ai's connector settings — you can't add a second
connector pointed at the same `/api/mcp` URL with a different token, even
for a different account. The local stdio server has no URL at all, so that
restriction doesn't apply: it's just a second process, scoped by an
explicit `MCP_USER_UID` in its own `env` block in `.mcp.json`, independent
of whatever's in `.env`/`.env.local` (which stays pointed at your real
account, untouched).

## What's actually in `.mcp.json`

```json
"built-daily-test": {
  "command": "npx",
  "args": ["tsx", "mcp/server.ts"],
  "env": { "MCP_USER_UID": "<test account's Firebase uid>" }
}
```

The uid isn't a secret — on its own it can't authenticate anything, it just
tells the Admin SDK whose data to read/write once it's already
authenticated. The actual access control is
`GOOGLE_APPLICATION_CREDENTIALS` (the service account key), which stays out
of git the same as always. Because the uid resolves to a throwaway test
account with no real data, committing it here is low-risk — don't do the
same for a real account's uid.

## Using it

Once Claude Code reconnects to this repo and you approve the new server,
`built-daily-test`'s tools (same three as the regular local server:
`list_recent_sessions`, `get_session`, `search_exercises`) operate only on
the test account's data — safe to use for checking that a change (e.g. the
signal-recompute work) behaves correctly without touching real data.
