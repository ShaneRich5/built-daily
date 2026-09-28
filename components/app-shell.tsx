"use client";

import type { ReactNode } from "react";
import { AccountBar } from "@/components/account-bar";
import { BottomTabBar } from "@/components/bottom-tab-bar";

/** Reserves space above the fixed tab bar so page content never sits under it. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-6 pb-[calc(1.5rem+var(--bottom-nav-height,0px))] sm:px-5 sm:py-8 sm:pb-[calc(2rem+var(--bottom-nav-height,0px))]"
      >
        <AccountBar />
        {children}
      </div>
      <BottomTabBar />
    </>
  );
}
