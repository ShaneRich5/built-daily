import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { writeSyncedDailyMetrics } from "@/lib/daily-metric-admin";
import {
  DAILY_METRIC_MAX_BATCH,
  parseDailyMetricInput,
  type DailyMetricInput,
} from "@/lib/daily-metric-input";
import { localDateKeyFromMs } from "@/lib/workout-date";
import {
  mcpTokenVerifier,
  requestWithBearerToken,
  uidFromAuthInfo,
} from "@/mcp/bearer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily health totals from outside the app: the iOS Shortcut bridge today,
 * native HealthKit / Health Connect later. See docs/STEP_CHALLENGE.md.
 *
 *   POST /api/health/daily
 *   Authorization: Bearer bd_live_…   (a personal access token from Settings)
 *   [{ "date": "2026-11-24", "metric": "steps", "value": 8214, "source": "apple_health" }]
 *
 * The body may also be `{ "entries": [...] }`, which is easier to build in
 * Shortcuts. Each item writes only `metrics.<metric>.sources.<source>` on that
 * day and re-resolves the day's value, so a number the user typed in the app
 * still wins. The whole batch is checked first; if any item is invalid,
 * nothing is written.
 */

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

/** The token's owner, or a 401. Same tokens as the MCP server (PATs and OAuth). */
async function requireUid(request: Request): Promise<string | Response> {
  const header = requestWithBearerToken(request).headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const challenge = { "WWW-Authenticate": 'Bearer realm="built-daily"' };
  if (!token) {
    return json({ error: "Missing bearer token." }, 401, challenge);
  }
  try {
    return uidFromAuthInfo(await mcpTokenVerifier.verifyAccessToken(token));
  } catch {
    return json({ error: "Invalid or revoked token." }, 401, challenge);
  }
}

function batchFrom(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body;
  const entries = (body as { entries?: unknown } | null)?.entries;
  return Array.isArray(entries) ? entries : null;
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return json({ error: "Firebase Admin credentials are not configured" }, 503);
  }

  const uid = await requireUid(request);
  if (uid instanceof Response) return uid;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }

  const batch = batchFrom(body);
  if (!batch || batch.length === 0) {
    return json(
      { error: "Send a non-empty array of { date, metric, value, source }, or { entries: [...] }." },
      400,
    );
  }
  if (batch.length > DAILY_METRIC_MAX_BATCH) {
    return json({ error: `Send at most ${DAILY_METRIC_MAX_BATCH} entries at once.` }, 400);
  }

  const todayKey = localDateKeyFromMs(Date.now());
  const inputs: DailyMetricInput[] = [];
  const errors: { index: number; error: string }[] = [];
  batch.forEach((raw, index) => {
    const parsed = parseDailyMetricInput(raw, todayKey);
    if (parsed.ok) inputs.push(parsed.input);
    else errors.push({ index, error: parsed.error });
  });
  if (errors.length > 0) {
    return json({ error: "Nothing was saved. Fix these entries and resend.", errors }, 400);
  }

  try {
    const results = await writeSyncedDailyMetrics(uid, inputs);
    return json({ ok: true, results });
  } catch (err) {
    console.error("health/daily write failed:", err);
    return json({ error: "Couldn't save. Try again." }, 500);
  }
}
