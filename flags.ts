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

/** Which consistency view the Progress page shows. */
export type ProgressHeatmapStyle = "weeks" | "year";

export const progressHeatmapFlag = flag<ProgressHeatmapStyle>({
  key: "progress-heatmap",
  description:
    "Progress page consistency view: the 16-week chart inside the This week card, or the year-long Consistency heatmap.",
  // What production showed before the This week redesign: the year heatmap.
  defaultValue: "year",
  options: [
    { value: "weeks", label: "16-week chart (in This week)" },
    { value: "year", label: "Year heatmap (Consistency)" },
  ],
  adapter: vercelAdapter,
});
