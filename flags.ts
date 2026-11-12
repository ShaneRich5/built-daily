/**
 * Feature flags (Vercel Flags via the Flags SDK). Each flag is a function that
 * evaluates on the server; call it from a server component or route and pass the
 * value down as a prop, since most of the app's UI is client components.
 *
 * Values are set per environment in the Vercel dashboard (Flags tab). Anyone with
 * access to the Vercel Toolbar can override a flag for their own browser through
 * Flags Explorer. Locally, without `vercel env pull` (VERCEL_OIDC_TOKEN), flags
 * fall back to their `defaultValue`.
 */
import { vercelAdapter } from "@flags-sdk/vercel";
import { flag } from "flags/next";

/** The redesigned Progress page (Home's This week card) instead of the old one. */
export const progressRedesignFlag = flag<boolean>({
  key: "progress-redesign",
  description:
    "Progress page: the new design (Home's This week card with streak and 16-week chart) or the old one (This week card, streak tiles, year heatmap).",
  // Off: the design production shows today.
  defaultValue: false,
  options: [
    { value: false, label: "Old design" },
    { value: true, label: "New design" },
  ],
  adapter: vercelAdapter,
});

/** Home's split Start button (H7) instead of the old Start card with its template list. */
export const homeStartRedesignFlag = flag<boolean>({
  key: "home-start-redesign",
  description:
    "Home Start card: the new split button (one-tap suggested start, chevron menu for everything else) or the old card (Start empty workout plus a list of up to 3 templates).",
  // Off: the design production shows today.
  defaultValue: false,
  options: [
    { value: false, label: "Old design" },
    { value: true, label: "New design" },
  ],
  adapter: vercelAdapter,
});
