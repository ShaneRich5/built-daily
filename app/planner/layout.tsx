import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Planner",
  description: "Track completed workouts and schedule upcoming sessions.",
};

export default function PlannerLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
