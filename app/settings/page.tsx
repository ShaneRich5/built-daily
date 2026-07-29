import type { Metadata } from "next";
import { SettingsProfileSharing } from "@/components/settings-profile-sharing";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your public profile and sharing preferences.",
};

export default function SettingsPage() {
  return <SettingsProfileSharing />;
}
