"use client";

import { Calendar, Home, LineChart, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/planner",
    label: "Planner",
    icon: Calendar,
    match: (p: string) => p.startsWith("/planner"),
  },
  {
    href: "/groups",
    label: "Groups",
    icon: Users,
    match: (p: string) => p.startsWith("/groups"),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: LineChart,
    match: (p: string) => p.startsWith("/progress"),
  },
] as const;

/** Routes with their own full-screen flow — no tab switching mid-flow. */
const HIDDEN_PATHS = new Set(["/login", "/onboarding"]);

/** Shared with the layout so it can reserve matching space above the bar. */
export function useShowBottomTabBar(): boolean {
  const pathname = usePathname();
  const { user, firebaseReady } = useAuth();
  return Boolean(user) && firebaseReady && !HIDDEN_PATHS.has(pathname);
}

export function BottomTabBar() {
  const pathname = usePathname();
  const show = useShowBottomTabBar();

  if (!show) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex w-full max-w-2xl">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
                active
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <Icon
                className="size-5"
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
