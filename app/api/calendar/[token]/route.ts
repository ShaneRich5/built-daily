import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import {
  listCalendarFeedEntries,
  looksLikeCalendarFeedToken,
  resolveCalendarFeedToken,
} from "@/lib/calendar-feed-admin";
import { buildPlannerIcs } from "@/lib/calendar-feed-ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The planner as an iCalendar feed: `/api/calendar/<token>.ics`.
 * Calendar apps fetch this on their own schedule with no sign-in, so the
 * secret token in the path is the only credential. Make or reset it in Settings.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token: raw } = await ctx.params;
  const token = raw.replace(/\.ics$/i, "");

  if (!looksLikeCalendarFeedToken(token)) {
    return new Response("Not found", { status: 404 });
  }
  if (!isFirebaseAdminConfigured()) {
    return new Response("Calendar feeds aren't configured on this server", {
      status: 503,
    });
  }

  const uid = await resolveCalendarFeedToken(token);
  if (!uid) {
    return new Response("Not found", { status: 404 });
  }

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const entries = await listCalendarFeedEntries(uid, todayKey);
  const body = buildPlannerIcs({
    entries,
    origin: new URL(request.url).origin,
    now,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="built-daily.ics"',
      // Personal data behind a secret URL: never store it in a shared cache.
      "Cache-Control": "private, max-age=300",
    },
  });
}
