import { GroupDetail } from "@/components/group-detail";

type GroupPageProps = {
  params: Promise<{ groupId: string }>;
};

export async function generateMetadata({ params }: GroupPageProps) {
  const { groupId } = await params;
  return {
    title: "Group",
    description: `Accountability group ${groupId}`,
  };
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params;
  return <GroupDetail groupId={groupId} />;
}
