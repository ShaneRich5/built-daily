"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { GROUP_LIMITS, type GroupKind } from "@/lib/group-types";
import { cn } from "@/lib/utils";
import { primaryGreen, sectionLabel } from "@/features/groups/group-ui";

export type NewGroupInput = { kind: GroupKind; name: string; buddyNickname: string | null };

const input =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

const KINDS: { kind: GroupKind; title: string; body: string }[] = [
  {
    kind: "buddy",
    title: "Gym buddy",
    body: "Just you and one person. See each other’s week, plan sessions, keep each other going.",
  },
  {
    kind: "group",
    title: "Group",
    body: "Up to 12 people. A running club, coworkers, the 6 AM regulars.",
  },
];

/** G4: buddy or group, a name, and exactly what's shared. */
export function NewGroupSheet({
  open,
  onOpenChange,
  onCreate,
  atLimit = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves false (or throws) when it couldn't be created. */
  onCreate: (input: NewGroupInput) => Promise<boolean>;
  atLimit?: boolean;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Train with someone"
      description="You’ll get a link to send. Nothing is shared until they join."
    >
      {open ? <NewGroupForm onCreate={onCreate} atLimit={atLimit} /> : null}
    </BottomSheet>
  );
}

function NewGroupForm({ onCreate, atLimit }: { onCreate: (input: NewGroupInput) => Promise<boolean>; atLimit: boolean }) {
  const [kind, setKind] = useState<GroupKind>("buddy");
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = kind === "buddy" ? true : name.trim().length > 0;

  const submit = async () => {
    if (!ready || busy || atLimit) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await onCreate({
        kind,
        name: kind === "buddy" ? "Gym buddies" : name.trim(),
        buddyNickname: kind === "buddy" ? nickname.trim() || null : null,
      });
      if (!ok) setError("Couldn’t create it. Check your connection and try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t create it. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div role="radiogroup" aria-label="Who's it for" className="flex flex-col gap-2">
        {KINDS.map((k) => {
          const on = kind === k.kind;
          return (
            <button
              key={k.kind}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setKind(k.kind)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left",
                on
                  ? "border-emerald-700 bg-emerald-50/60 dark:border-emerald-500 dark:bg-emerald-950/30"
                  : "border-zinc-200 dark:border-zinc-700",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  on ? "border-emerald-700 dark:border-emerald-500" : "border-zinc-300 dark:border-zinc-600",
                )}
              >
                {on ? <span className="size-2.5 rounded-full bg-emerald-700 dark:bg-emerald-500" /> : null}
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{k.title}</span>
                <span className="mt-0.5 block text-[13px] text-zinc-600 dark:text-zinc-400">{k.body}</span>
              </span>
            </button>
          );
        })}
      </div>

      {kind === "buddy" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Who’s it with? (just for you)</span>
          <input
            className={input}
            value={nickname}
            maxLength={GROUP_LIMITS.displayName}
            placeholder="Alex"
            onChange={(e) => setNickname(e.target.value)}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Shows as “You &amp; {nickname.trim() || "Alex"}” until they join with their own name.
          </span>
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Group name</span>
          <input
            className={input}
            value={name}
            maxLength={GROUP_LIMITS.name}
            placeholder="Morning Crew"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      )}

      <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-900/60">
        <h3 className={sectionLabel}>What they’ll see</h3>
        <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
            Days you train and plan, and the workout name
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
            Your weekly goal and how close you are
          </li>
          <li className="flex gap-2">
            <X className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
            Never your sets, weights, notes or body weight
          </li>
        </ul>
      </div>

      {atLimit ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You’re in {GROUP_LIMITS.maxGroupsPerUser} groups, the most for now.
        </p>
      ) : null}
      {error ? <p className="text-sm text-zinc-700 dark:text-zinc-300">{error}</p> : null}

      <button type="submit" disabled={!ready || busy || atLimit} className={primaryGreen}>
        {busy ? "Creating…" : "Create & get invite link"}
      </button>
    </form>
  );
}
