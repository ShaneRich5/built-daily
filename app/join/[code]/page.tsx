import type { Metadata } from "next";
import { JoinGroupLanding } from "@/components/join-group-landing";

export const metadata: Metadata = {
  title: "Join a group",
};

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <JoinGroupLanding code={code} />;
}
