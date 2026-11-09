"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Pinned under the scrolling body, e.g. the primary action. */
  footer?: ReactNode;
  /** `fullscreen` covers the whole screen (detail views); `sheet` rises from the bottom. */
  variant?: "sheet" | "fullscreen";
  /** Hide the visible title row (the title is still announced to screen readers). */
  hideHeader?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Accessible modal that slides up from the bottom on phones. Focus is trapped
 * inside while open, Escape / backdrop tap close it, and focus returns to the
 * button that opened it.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  variant = "sheet",
  hideHeader = false,
  children,
  className,
}: BottomSheetProps) {
  const fullscreen = variant === "fullscreen";
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-zinc-950/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-2xl flex-col bg-white text-zinc-900 shadow-xl outline-none transition-transform duration-200 ease-out data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full motion-reduce:transition-none dark:bg-zinc-950 dark:text-zinc-50",
            fullscreen
              ? "top-0 h-dvh"
              : "max-h-[90dvh] rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800",
            className,
          )}
        >
          {!fullscreen ? (
            <div className="flex justify-center pt-2" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
          ) : null}
          {hideHeader ? (
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
          ) : (
            <div className="px-4 pt-3 pb-2">
              <Dialog.Title className="text-lg font-semibold tracking-tight">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {footer ? (
            <div className="border-t border-zinc-200 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-zinc-800">
              {footer}
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Closes the nearest BottomSheet (renders a plain button). */
export const BottomSheetClose = Dialog.Close;
