import { PlanScreen } from "@/features/groups/plan-screen";

type PlanPageProps = {
  params: Promise<{ groupId: string; planId: string }>;
};

export const metadata = {
  title: "Plan together",
};

export default async function SharedPlanPage({ params }: PlanPageProps) {
  const { groupId, planId } = await params;
  return <PlanScreen groupId={groupId} planId={planId} />;
}
