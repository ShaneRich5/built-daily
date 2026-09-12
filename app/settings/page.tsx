import type { Metadata } from "next";
import { SettingsMcpTokens } from "@/components/settings-mcp-tokens";
import { SettingsProfileSharing } from "@/components/settings-profile-sharing";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your public profile and sharing preferences.",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-10">
      <SettingsProfileSharing />
      <SettingsMcpTokens />
    </div>
  );
}
