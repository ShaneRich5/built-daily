import { GroupScreen } from "@/features/groups/group-screen";

type GroupPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ invite?: string }>;
};

export const metadata = {
  title: "Group",
};

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const { groupId } = await params;
  const { invite } = await searchParams;
  // `key` so a fresh `?invite=1` (right after creating) opens the invite sheet.
  return <GroupScreen key={invite ?? ""} groupId={groupId} openInvite={invite === "1"} />;
}
