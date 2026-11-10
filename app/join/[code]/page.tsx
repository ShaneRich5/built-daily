import type { Metadata } from "next";
import { JoinScreen } from "@/features/groups/join-screen";

export const metadata: Metadata = {
  title: "You're invited",
};

export default async function JoinGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ plan?: string; auto?: string }>;
}) {
  const { code } = await params;
  const { plan, auto } = await searchParams;
  return <JoinScreen code={code} planId={plan?.trim() || null} auto={auto === "1"} />;
}
