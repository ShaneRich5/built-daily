import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Load KEY=value lines without overwriting variables already in the environment.
 * stdout is reserved for MCP JSON-RPC — do not log from here.
 */
function loadEnvFile(fileName: string): void {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** Load `.env.local` then `.env` (both gitignored). Call before reading MCP env. */
export function loadMcpEnv(): void {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (creds && !path.isAbsolute(creds)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
      process.cwd(),
      creds,
    );
  }
}

export function getMcpUserUid(): string {
  const uid = process.env.MCP_USER_UID?.trim();
  if (!uid) {
    throw new Error(
      "Set MCP_USER_UID in .env.local to your Firebase Auth uid.",
    );
  }
  return uid;
}
