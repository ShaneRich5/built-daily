"use client";

import { CalendarPlus, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  CopyField,
  ErrorLine,
  SettingsSection,
  primaryButton,
  secondaryButton,
} from "@/features/settings/settings-ui";

export type CalendarFeedCardProps = {
  loaded: boolean;
  /** The secret feed address, or null before one is made. */
  url: string | null;
  busy: boolean;
  error: string | null;
  /** Makes the link, or replaces it with a new one. */
  onCreate: () => void;
};

/** `https://…` → `webcal://…`, the scheme calendar apps open as a subscription. */
function toWebcal(url: string): string {
  return url.replace(/^https?:/, "webcal:");
}

/** Google Calendar's "add by URL" screen, prefilled with the feed. */
function googleCalendarAddUrl(url: string): string {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(toWebcal(url))}`;
}

/** Subscribe to your planner from Google Calendar, Apple Calendar or anything that reads .ics. */
export function CalendarFeedCard(props: CalendarFeedCardProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <SettingsSection id="calendar-heading" title="Calendar">
      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
          See your planned workouts in your calendar. Each one shows as an
          all-day event, and the calendar follows your planner as you add or
          move days.
        </p>

        {!props.loaded ? (
          <p className="text-[13px] text-zinc-500">Loading…</p>
        ) : !props.url ? (
          <button
            type="button"
            disabled={props.busy}
            onClick={props.onCreate}
            className={`${primaryButton} self-start`}
          >
            <CalendarPlus className="size-4" aria-hidden />
            Make a calendar link
          </button>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <a
                href={googleCalendarAddUrl(props.url)}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButton}
              >
                <ExternalLink className="size-4" aria-hidden />
                Add to Google Calendar
              </a>
              <a
                href={toWebcal(props.url)}
                className={`${secondaryButton} h-11`}
              >
                Add to Apple Calendar
              </a>
            </div>
            <CopyField
              label="Calendar link (for Outlook and other apps)"
              value={props.url}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Google Calendar checks for changes every few hours, so a day you
              just planned or moved can take a while to show up there.
            </p>
          </>
        )}

        <ErrorLine message={props.error} />
      </div>

      {props.url ? (
        <div className="flex flex-col gap-2.5 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
            Anyone with this link can see your planned workouts. If you shared
            it by mistake, get a new one.
          </p>
          {confirmingReset ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-50">
                The old link stops working, so add the new one to your calendar
                again.
              </p>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className={secondaryButton}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={props.busy}
                  onClick={() => {
                    setConfirmingReset(false);
                    props.onCreate();
                  }}
                  className="inline-flex h-10 items-center rounded-[10px] bg-red-600 px-3 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Get a new link
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={props.busy}
              onClick={() => setConfirmingReset(true)}
              className={`${secondaryButton} self-start`}
            >
              Get a new link
            </button>
          )}
        </div>
      ) : null}
    </SettingsSection>
  );
}
