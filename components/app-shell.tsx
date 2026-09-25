"use client";

import type { ReactNode } from "react";
import { AccountBar } from "@/components/account-bar";
import { BottomTabBar, useShowBottomTabBar } from "@/components/bottom-tab-bar";

/** Reserves space above the fixed tab bar so page content never sits under it. */
export function AppShell({ children }: { children: ReactNode }) {
  const showTabBar = useShowBottomTabBar();

  return (
    <>
      <div
        className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-6 sm:px-5 sm:py-8"
        style={
          showTabBar
            ? { paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }
            : undefined
        }
      >
        <AccountBar />
        {children}
      </div>
      <BottomTabBar />
    </>
  );
}
