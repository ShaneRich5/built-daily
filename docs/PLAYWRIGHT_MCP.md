# Playwright MCP (UI review)

`.mcp.json` registers a Playwright MCP server (`@playwright/mcp`) so Claude
can drive a real browser against the local dev server — navigate, click
through flows, take its own screenshots — instead of relying on manually
pasted screenshots for UI feedback.

This is a developer tool, unrelated to the app's own MCP server
(`mcp/`, see [`MCP_MULTI_USER.md`](./MCP_MULTI_USER.md)), which exposes
workout data to end users' own agents. Don't confuse the two.

## First run

The server downloads on first use (`npx @playwright/mcp@latest`), including
a headless Chromium build (~300MB). Claude Code will prompt to approve the
new project MCP server the first time it loads this repo.

## Using it for UI review

- Point it at the local dev server (`npm run dev`, default
  `http://localhost:3000`).
- Log in through the browser using a **test account**, not your real one —
  see [`MCP_MULTI_USER.md`](./MCP_MULTI_USER.md) for the account/token setup
  used for data-level MCP testing. Using the same isolated test account for
  both keeps UI checks off production data.
- Screenshots Playwright captures still cost the same image tokens as a
  pasted one when Claude actually looks at them — this setup removes the
  manual hand-off step, not the token cost of viewing an image.

## Test account credentials

Copy [`playwright-test.local.example.json`](../playwright-test.local.example.json)
to `playwright-test.local.json` (repo root) and fill in the test account's
email/password. That filename is gitignored, so it never gets committed.

Claude reads this file only when it's about to drive the browser through a
login, and doesn't copy the values into its persistent memory — the
credentials live only in this file and in that session's working context.
Because it's a throwaway test account with no real data, the exposure if
this file ever leaked is low, but keep it out of screenshots, logs, or
anywhere else it could end up pasted.

Ref: #17.
