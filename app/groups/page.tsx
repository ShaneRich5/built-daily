import type { Metadata } from "next";
import { GroupsScreen } from "@/features/groups/groups-screen";

export const metadata: Metadata = {
  title: "Groups",
  description: "Train with a buddy or a small group: a shared week and plans together.",
};

export default function GroupsPage() {
  return <GroupsScreen />;
}
