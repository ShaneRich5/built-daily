"use client";

import Link from "next/link";
import { BookOpen, History, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AccountMenuProps = {
  email: string | null;
  onSignOut: () => void;
};

/** First letter of the email, as a quiet avatar. */
function initial(email: string | null): string {
  return email?.trim().charAt(0).toUpperCase() || "?";
}

/** The round initial button on home: catalog, history, settings and sign out live behind it. */
export function AccountMenu({ email, onSignOut }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-[15px] font-semibold text-zinc-700 hover:bg-zinc-50 data-[popup-open]:border-zinc-900 data-[popup-open]:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:data-[popup-open]:border-zinc-100"
          />
        }
      >
        {initial(email)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        {email ? (
          <>
            <div className="flex flex-col gap-0.5 px-1.5 py-2">
              <span className="text-xs text-zinc-500">Signed in as</span>
              <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {email}
              </span>
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem className="min-h-11 gap-2" render={<Link href="/catalog" />}>
          <BookOpen className="size-4" aria-hidden />
          Exercise catalog
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 gap-2" render={<Link href="/history" />}>
          <History className="size-4" aria-hidden />
          History &amp; export
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 gap-2" render={<Link href="/settings" />}>
          <Settings className="size-4" aria-hidden />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="min-h-11 gap-2" onClick={onSignOut}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
