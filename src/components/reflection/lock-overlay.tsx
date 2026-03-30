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
  const [todosCreatedCount, setTodosCreatedCount] = useState(0);
  const [processingTodos, setProcessingTodos] = useState(false);

  async function handleReflectionCreated(id: string, date: string, todoText: string) {
    setReflectionId(id);
    setReflectionDate(date);
    setPhase("generating");
    setError(null);

    const hasTodos = todoText.trim().length > 0;
    setProcessingTodos(hasTodos);

    try {
      // Build parallel requests
      const reflectionPromise = fetch("/api/agents/nightly-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_id: id, date }),
      });

      const promises: Promise<Response>[] = [reflectionPromise];

      if (hasTodos) {
        promises.push(
          fetch("/api/agents/todo-parser", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ todo_text: todoText.trim(), date }),
          })
        );
      }

      const responses = await Promise.all(promises);

      // Handle reflection response
      const reflectionRes = responses[0];
      if (!reflectionRes.ok) {
        const body = await reflectionRes.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error ?? `Request failed: ${reflectionRes.status}`);
      }
      const reflectionData = await reflectionRes.json();

      // Handle todo response (silent failure)
      if (hasTodos && responses[1]) {
        try {
          const todoRes = responses[1];
          if (todoRes.ok) {
            const todoData = await todoRes.json();
            setTodosCreatedCount(todoData.todos?.length ?? 0);
          }
        } catch {
          // Don't block reflection flow for todo failures
        }
      }

      setActions(
        reflectionData.actions.map((a: GeneratedAction) => ({ ...a, status: "accepted" as const }))
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white/80 backdrop-blur-sm">
      <div className="flex min-h-full w-full items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {phase === "input" && (
            <ReflectionInput
              lastReflectionDate={lastReflectionDate}
              onReflectionCreated={handleReflectionCreated}
              error={error}
            />
          )}

          {phase === "generating" && (
            <div className="overflow-hidden rounded-lg border bg-white shadow-lg">
              <div className="bg-primary px-4 py-3">
                <h2 className="text-sm font-semibold text-primary-foreground">
                  Processing
                </h2>
              </div>
              <div className="flex flex-col items-center gap-3 p-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  {processingTodos
                    ? "Generating actions and processing todos..."
                    : "Generating actions from your reflection..."}
                </p>
              </div>
            </div>
          )}

          {phase === "review" && (
            <div className="flex flex-col gap-3">
              {todosCreatedCount > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-xs text-green-700">
                  {todosCreatedCount} todo{todosCreatedCount !== 1 ? "s" : ""} added to your board.
                </div>
              )}
              <ActionReview
                actions={actions}
                activePushes={activePushes}
                activeObjectives={activeObjectives}
                onConfirm={handleConfirm}
                isConfirming={isConfirming}
                error={error}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
