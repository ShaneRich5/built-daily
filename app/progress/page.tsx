import type { Metadata } from "next";
import { progressRedesignFlag } from "@/flags";
import { ProgressScreen } from "@/features/progress/progress-screen";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Consistency, weekly goals, strength, weight, and milestones—without the noise.",
};

export default async function ProgressPage() {
  // Evaluated on the server (Vercel Flags), then handed to the client screen.
  const redesign = await progressRedesignFlag();
  return <ProgressScreen redesign={redesign} />;
}
