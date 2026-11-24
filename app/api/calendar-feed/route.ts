import { requireUid } from "@/lib/api-auth";
import {
  createCalendarFeedToken,
  getCalendarFeedToken,
} from "@/lib/calendar-feed-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The public address a calendar app subscribes to. */
function feedUrl(request: Request, token: string): string {
  return `${new URL(request.url).origin}/api/calendar/${token}.ics`;
}

/** The caller's calendar feed link, or `{ url: null }` if they haven't made one. */
export async function GET(request: Request) {
  const uid = await requireUid(request);
  if (uid instanceof Response) return uid;

  const token = await getCalendarFeedToken(uid);
  return Response.json({ url: token ? feedUrl(request, token) : null });
}

/** Makes the caller's feed link, or replaces it (the old link stops working). */
export async function POST(request: Request) {
  const uid = await requireUid(request);
  if (uid instanceof Response) return uid;

  const token = await createCalendarFeedToken(uid);
  return Response.json({ url: feedUrl(request, token) });
}
