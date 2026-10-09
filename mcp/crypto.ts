import { createHash, randomBytes } from "node:crypto";

/**
 * Shared secret-handling primitives for the MCP auth surface: personal access
 * tokens (mcp/tokens.ts) and the OAuth authorization server (mcp/oauth-*.ts).
 * Everything secret is stored as a SHA-256 hash, never in plaintext.
 */

/** Hashes a token/code for storage. The hash is the Firestore doc ID. */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Generates a URL-safe random secret with a recognizable prefix. */
export function randomSecret(prefix: string): string {
  return prefix + randomBytes(32).toString("base64url");
}

/** Converts a Firestore Timestamp-ish value to a Date, or null. */
export function toDateOrNull(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}
