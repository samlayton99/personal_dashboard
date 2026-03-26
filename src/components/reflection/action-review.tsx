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
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Review Proposed Actions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {acceptedCount} of {actions.length} actions will be saved. Edit
          descriptions, adjust impact scores, or link to different pushes and
          objectives.
        </p>
      </div>

      <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1">
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        onClick={() => onConfirm(actions)}
        disabled={isConfirming || acceptedCount === 0}
        className="self-end"
      >
        {isConfirming
          ? "Saving..."
          : `Confirm ${acceptedCount} Action${acceptedCount !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
