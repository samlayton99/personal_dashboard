"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionCard } from "./action-card";
import type { Database } from "@/types/database";

type Push = Database["public"]["Tables"]["pushes"]["Row"];
type Objective = Database["public"]["Tables"]["objectives"]["Row"];

type ActionStatus = "accepted" | "edited" | "rejected";

interface ActionData {
  id: string;
  description: string;
  needle_score: number;
  push_ids: string[];
  objective_ids: string[];
  status: ActionStatus;
}

interface ActionReviewProps {
  actions: Array<{
    id: string;
    description: string;
    needle_score: number;
    push_ids: string[];
    objective_ids: string[];
    status: string;
  }>;
  activePushes: Push[];
  activeObjectives: Objective[];
  onConfirm: (
    actions: Array<{
      id: string;
      description: string;
      needle_score: number;
      push_ids: string[];
      objective_ids: string[];
      status: "accepted" | "edited" | "rejected";
    }>
  ) => void;
  isConfirming: boolean;
  error: string | null;
}

export function ActionReview({
  actions: initialActions,
  activePushes,
  activeObjectives,
  onConfirm,
  isConfirming,
  error,
}: ActionReviewProps) {
  const [actions, setActions] = useState<ActionData[]>(
    initialActions.map((a) => ({
      ...a,
      status: "accepted" as ActionStatus,
    }))
  );

  function handleUpdate(updated: ActionData) {
    setActions((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  }

  const acceptedCount = actions.filter(
    (a) => a.status === "accepted" || a.status === "edited"
  ).length;

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-lg">
      <div className="bg-primary px-4 py-3">
        <h2 className="text-sm font-semibold text-primary-foreground">
          Review Proposed Actions
        </h2>
        <p className="mt-0.5 text-xs text-primary-foreground/70">
          {acceptedCount} of {actions.length} actions will be saved
        </p>
      </div>

      <div className="max-h-[55vh] overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              activePushes={activePushes}
              activeObjectives={activeObjectives}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3">
        <div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <Button
          onClick={() => onConfirm(actions)}
          disabled={isConfirming || acceptedCount === 0}
          size="sm"
        >
          {isConfirming
            ? "Saving..."
            : `Confirm ${acceptedCount} Action${acceptedCount !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
