"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ActionCard } from "./action-card";
import { createTempId } from "@/lib/utils/temp-id";
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

  const [newActionText, setNewActionText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleUpdate(updated: ActionData) {
    setActions((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  }

  function handleAddAction() {
    const text = newActionText.trim();
    if (!text) return;
    setActions((prev) => [
      ...prev,
      {
        id: createTempId("action"),
        description: text,
        needle_score: 5,
        push_ids: [],
        objective_ids: [],
        status: "edited" as ActionStatus,
      },
    ]);
    setNewActionText("");
    inputRef.current?.focus();
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
          {actions.length === 0
            ? "No actions were generated"
            : `${acceptedCount} of ${actions.length} actions will be saved`}
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

          {/* Add custom action */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newActionText}
              onChange={(e) => setNewActionText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddAction(); }}
              placeholder="Add your own action..."
              className="flex-1 rounded-md border px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              onClick={handleAddAction}
              disabled={!newActionText.trim()}
              size="sm"
              variant="outline"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3">
        <div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <Button
          onClick={() => onConfirm(actions)}
          disabled={isConfirming}
          size="sm"
        >
          {isConfirming
            ? "Saving..."
            : acceptedCount === 0
              ? "Unlock"
              : `Confirm ${acceptedCount} Action${acceptedCount !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
