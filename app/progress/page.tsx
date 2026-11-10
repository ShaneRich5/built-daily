import type { Metadata } from "next";
import { progressHeatmapFlag } from "@/flags";
import { ProgressScreen } from "@/features/progress/progress-screen";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Consistency, weekly goals, strength, weight, and milestones—without the noise.",
};

export default async function ProgressPage() {
  // Evaluated on the server (Vercel Flags), then handed to the client screen.
  const heatmap = await progressHeatmapFlag();
  return <ProgressScreen heatmapStyle={heatmap} />;
}
