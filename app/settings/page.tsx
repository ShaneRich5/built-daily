import type { Metadata } from "next";
import { SettingsScreen } from "@/features/settings/settings-screen";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your account, public profile, and the Claude connector.",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
