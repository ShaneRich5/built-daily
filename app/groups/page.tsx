import type { Metadata } from "next";
import { GroupsList } from "@/components/groups-list";

export const metadata: Metadata = {
  title: "Groups",
  description: "Lightweight accountability groups with invite codes.",
};

export default function GroupsPage() {
  return <GroupsList />;
}
