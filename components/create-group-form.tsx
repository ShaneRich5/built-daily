"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAccountabilityGroup } from "@/lib/group-repository";
import { GROUP_LIMITS } from "@/lib/group-types";

type CreateGroupFormProps = {
  disabled?: boolean;
};

export function CreateGroupForm({ disabled }: CreateGroupFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    setError(null);
    setBusy(true);
    try {
      const result = await createAccountabilityGroup(name);
      if (!result) {
        setError("Couldn’t create the group. Try again.");
        return;
      }
      router.push(`/groups/${result.groupId}`);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong creating the group.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={GROUP_LIMITS.name}
          placeholder="Morning crew"
          disabled={busy || disabled}
          autoComplete="off"
        />
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <Button type="submit" disabled={busy || disabled || !name.trim()} size="lg">
        {busy ? "Creating…" : "Create group"}
      </Button>
    </form>
  );
}
