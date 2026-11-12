import { homeStartRedesignFlag } from "@/flags";
import { HomeScreen } from "@/features/home/home-screen";

export default async function HomePage() {
  // Evaluated on the server (Vercel Flags), then handed to the client screen.
  const startRedesign = await homeStartRedesignFlag();
  return <HomeScreen startRedesign={startRedesign} />;
}
