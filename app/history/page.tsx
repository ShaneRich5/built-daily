import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HomeTimeline } from "@/components/home-timeline";

/** Every workout and activity, newest first, with journal export. Reached from home's "See all". */
export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Back to home"
          className="-ml-2.5 inline-flex size-11 items-center justify-center rounded-lg text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">History</h1>
      </header>
      <HomeTimeline />
    </div>
  );
}
