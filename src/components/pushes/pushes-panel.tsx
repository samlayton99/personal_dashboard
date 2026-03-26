"use client";

import { useRef, useTransition } from "react";
import { Scoreboard } from "./scoreboard";
import { PushTile } from "./push-tile";
import { createPush } from "@/app/(dashboard)/first-principles/actions";
import type { Database } from "@/types/database";
import type { FeaturedAction } from "@/types/featured-actions";

type Push = Database["public"]["Tables"]["pushes"]["Row"];

interface ScoreboardData {
  streak: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
}

interface PushesPanelProps {
  pushes: Push[];
  selectedId: string | null;
  onPushesChange: (updater: (prev: Push[]) => Push[]) => void;
  onSelect: (id: string) => void;
  pushObjectiveMap: Record<string, string[]>;
  objectiveNameMap: Record<string, string>;
  scoreboardData: ScoreboardData;
  featuredActions?: Record<string, FeaturedAction[]>;
  onFeaturedActionClick?: (action: FeaturedAction) => void;
}

export function PushesPanel({
  pushes,
  selectedId,
  onPushesChange,
  onSelect,
  pushObjectiveMap,
  objectiveNameMap,
  scoreboardData,
  featuredActions = {},
  onFeaturedActionClick,
}: PushesPanelProps) {
  const [isPending, startTransition] = useTransition();
  const creatingRef = useRef(false);

  const activePushes = pushes
    .filter((p) => p.status === "active")
    .sort((a, b) => a.sort_order - b.sort_order);

  function handleCreate() {
    if (activePushes.length >= 5 || isPending || creatingRef.current) return;
    creatingRef.current = true;

    const tempId = `push_temp_${Date.now()}`;
    const newPush: Push = {
      id: tempId,
      name: "New Push",
      description: null,
      todos_notes: null,
      notes: null,
      status: "active",
      retirement_reason: null,
      retirement_note: null,
      progress_summary: null,
      sort_order: pushes.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onPushesChange((prev) => [...prev, newPush]);

    startTransition(async () => {
      const result = await createPush({ name: "New Push" });
      creatingRef.current = false;

      if ("error" in result) {
        onPushesChange((prev) => prev.filter((p) => p.id !== tempId));
        return;
      }

      // Replace temp with real ID
      onPushesChange((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, id: result.id } : p))
      );
      onSelect(result.id);
    });
  }

  const emptySlots = Math.max(0, 5 - activePushes.length);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center rounded-t-lg bg-primary px-3">
        <h2 className="text-sm font-semibold text-primary-foreground">Pushes</h2>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <div className="grid h-full grid-cols-3 grid-rows-2 gap-2">
          <Scoreboard
            streak={scoreboardData.streak}
            actionsThisWeek={scoreboardData.actionsThisWeek}
            actionsThisMonth={scoreboardData.actionsThisMonth}
          />

          {activePushes.map((push) => (
            <PushTile
              key={push.id}
              push={push}
              isSelected={push.id === selectedId}
              linkedObjectiveNames={
                (pushObjectiveMap[push.id] ?? []).map(
                  (oid) => objectiveNameMap[oid] ?? "Unknown"
                )
              }
              onClick={() => {
                // Don't open detail for temp items still being created
                if (push.id.startsWith("push_temp_")) return;
                onSelect(push.id);
              }}
              featuredActions={featuredActions[push.id]}
              onFeaturedActionClick={onFeaturedActionClick}
            />
          ))}

          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed transition-colors hover:border-primary/40 hover:bg-accent/50"
              onClick={handleCreate}
            >
              <span className="text-sm text-muted-foreground">
                {isPending ? "..." : "+ Add Push"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
