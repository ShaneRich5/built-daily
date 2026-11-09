import type { Metadata } from "next";
import { ProgressScreen } from "@/features/progress/progress-screen";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Consistency, weekly goals, strength, weight, and milestones—without the noise.",
};

export default function ProgressPage() {
  return <ProgressScreen />;
}
