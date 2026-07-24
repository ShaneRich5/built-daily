import type { Metadata } from "next";
import { ProgressDashboard } from "@/components/progress-dashboard";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Consistency, weekly goals, strength, weight, and milestones—without the noise.",
};

export default function ProgressPage() {
  return <ProgressDashboard />;
}
