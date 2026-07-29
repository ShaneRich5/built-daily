import type { Metadata } from "next";
import { PublicProfileView } from "@/components/public-profile-view";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: "Profile",
    description: "Public consistency snapshot on Built Daily.",
    robots: userId ? undefined : { index: false, follow: false },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { userId } = await params;
  return <PublicProfileView userId={userId} />;
}
