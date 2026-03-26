"use client";

import { useState } from "react";
import { ReflectionInput } from "./reflection-input";
import { ActionReview } from "./action-review";
import { finalizeActions } from "@/app/(dashboard)/first-principles/actions";
import type { Database } from "@/types/database";

type Push = Database["public"]["Tables"]["pushes"]["Row"];
type Objective = Database["public"]["Tables"]["objectives"]["Row"];

interface GeneratedAction {
  id: string;
  description: string;
  needle_score: number;
  push_ids: string[];
  objective_ids: string[];
  status: "pending" | "accepted" | "edited" | "rejected";
}

type Phase = "input" | "generating" | "review";

interface LockOverlayProps {
  lastReflectionDate: string | null;
  activePushes: Push[];
  activeObjectives: Objective[];
  onUnlock: () => void;
}

export function LockOverlay({
  lastReflectionDate,
  activePushes,
  activeObjectives,
  onUnlock,
}: LockOverlayProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [actions, setActions] = useState<GeneratedAction[]>([]);
  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [reflectionDate, setReflectionDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleReflectionCreated(id: string, date: string) {
    setReflectionId(id);
    setReflectionDate(date);
    setPhase("generating");
    setError(null);

    try {
      const res = await fetch("/api/agents/nightly-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_id: id, date }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }

      const data = await res.json();
      setActions(
        data.actions.map((a: GeneratedAction) => ({ ...a, status: "accepted" as const }))
      );
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate actions");
      setPhase("input");
    }
  }

  async function handleConfirm(
    finalActions: Array<{
      id: string;
      description: string;
      needle_score: number;
      push_ids: string[];
      objective_ids: string[];
      status: "accepted" | "edited" | "rejected";
    }>
  ) {
    if (!reflectionId || !reflectionDate) return;
    setIsConfirming(true);

    try {
      await finalizeActions({
        reflectionId,
        reflectionDate,
        actions: finalActions,
      });
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save actions");
      setIsConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl px-6">
        {phase === "input" && (
          <ReflectionInput
            lastReflectionDate={lastReflectionDate}
            onReflectionCreated={handleReflectionCreated}
            error={error}
          />
        )}

        {phase === "generating" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Generating actions from your reflection...
            </p>
          </div>
        )}

        {phase === "review" && (
          <ActionReview
            actions={actions}
            activePushes={activePushes}
            activeObjectives={activeObjectives}
            onConfirm={handleConfirm}
            isConfirming={isConfirming}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
