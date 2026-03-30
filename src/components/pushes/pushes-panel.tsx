"use client";

import { useRef, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useDndSensors } from "@/lib/hooks/use-dnd-sensors";
import { PushDistributionChart, CHART_COLORS, type PushActionSlice } from "./push-distribution-chart";
import { PushTile } from "./push-tile";
import { createPush, reorderPushes } from "@/app/(dashboard)/first-principles/actions";
import type { Database } from "@/types/database";
import type { FeaturedAction } from "@/types/featured-actions";
import { createTempId, isTempId } from "@/lib/utils/temp-id";

type Push = Database["public"]["Tables"]["pushes"]["Row"];

interface PushesPanelProps {
  pushes: Push[];
  selectedId: string | null;
  onPushesChange: (updater: (prev: Push[]) => Push[]) => void;
  onSelect: (id: string) => void;
  pushObjectiveMap: Record<string, string[]>;
  objectiveNameMap: Record<string, string>;
  pushActionDistribution: PushActionSlice[];
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
  pushActionDistribution,
  featuredActions = {},
  onFeaturedActionClick,
}: PushesPanelProps) {
  const [isPending, startTransition] = useTransition();
  const creatingRef = useRef(false);
  const sensors = useDndSensors({ distance: 8 });

  const activePushes = pushes
    .filter((p) => p.status === "active")
    .sort((a, b) => a.sort_order - b.sort_order);

  function handleCreate() {
    if (activePushes.length >= 5 || isPending || creatingRef.current) return;
    creatingRef.current = true;

    const tempId = createTempId("push");
    const maxSortOrder = activePushes.length > 0
      ? Math.max(...activePushes.map((p) => p.sort_order))
      : -1;
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
      sort_order: maxSortOrder + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onPushesChange((prev) => [...prev, newPush]);

    startTransition(async () => {
      try {
        const { id, sort_order } = await createPush({ name: "New Push" });
        creatingRef.current = false;
        onPushesChange((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, id, sort_order } : p))
        );
        onSelect(id);
      } catch {
        creatingRef.current = false;
        onPushesChange((prev) => prev.filter((p) => p.id !== tempId));
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activePushes.findIndex((p) => p.id === active.id);
    const newIndex = activePushes.findIndex((p) => p.id === over.id);
    const reordered = [...activePushes];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const updatedIds = reordered.map((p) => p.id);
    // Update sort_order for all active pushes, preserve inactive ones
    onPushesChange((prev) => {
      const inactive = prev.filter((p) => p.status !== "active");
      const updated = reordered.map((p, i) => ({ ...p, sort_order: i }));
      return [...inactive, ...updated];
    });

    startTransition(async () => {
      await reorderPushes(updatedIds);
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
          <PushDistributionChart slices={pushActionDistribution} />

          <DndContext
            id="pushes-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activePushes.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              {activePushes.map((push, i) => (
                <PushTile
                  key={push.id}
                  push={push}
                  isSelected={push.id === selectedId}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  linkedObjectiveNames={
                    (pushObjectiveMap[push.id] ?? []).map(
                      (oid) => objectiveNameMap[oid] ?? "Unknown"
                    )
                  }
                  onClick={() => {
                    if (isTempId(push.id)) return;
                    onSelect(push.id);
                  }}
                  featuredActions={featuredActions[push.id]}
                  onFeaturedActionClick={onFeaturedActionClick}
                />
              ))}
            </SortableContext>
          </DndContext>

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
