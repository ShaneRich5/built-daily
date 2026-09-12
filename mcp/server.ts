/**
 * Local stdio MCP for Built Daily (read-only).
 *
 * Cursor starts this process via `.cursor/mcp.json`. Do not write to stdout
 * except through the MCP transport. Put credentials in `.env` / `.env.local`.
 */
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createBuiltDailyServer } from "./create-server";
import { getMcpUserUid, loadMcpEnv } from "./env";

loadMcpEnv();

serveStdio(() => createBuiltDailyServer(getMcpUserUid()), {
  onerror: (error) => {
    console.error(error);
  },
});
