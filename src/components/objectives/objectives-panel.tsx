"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDndSensors } from "@/lib/hooks/use-dnd-sensors";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ObjectiveTile } from "./objective-tile";
import {
  createObjective,
  reorderObjectives,
} from "@/app/(dashboard)/first-principles/actions";
import type { Database } from "@/types/database";
import type { FeaturedAction } from "@/types/featured-actions";

type Objective = Database["public"]["Tables"]["objectives"]["Row"];

type SortMode = "manual" | "priority" | "neglected";

interface ObjectivesPanelProps {
  objectives: Objective[];
  selectedId: string | null;
  onObjectivesChange: (objectives: Objective[]) => void;
  onSelect: (id: string) => void;
  featuredActions?: Record<string, FeaturedAction[]>;
  onFeaturedActionClick?: (action: FeaturedAction) => void;
}

export function ObjectivesPanel({
  objectives,
  selectedId,
  onObjectivesChange,
  onSelect,
  featuredActions = {},
  onFeaturedActionClick,
}: ObjectivesPanelProps) {
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [isPending, startTransition] = useTransition();

  const sensors = useDndSensors();

  const sortedObjectives = getSorted(objectives, sortMode);

  function getSorted(objs: Objective[], mode: SortMode): Objective[] {
    switch (mode) {
      case "priority":
        return [...objs].sort((a, b) => b.current_priority - a.current_priority);
      case "neglected":
        return [...objs].sort(
          (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        );
      default:
        return [...objs].sort((a, b) => a.sort_order - b.sort_order);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = objectives.findIndex((o) => o.id === active.id);
    const newIndex = objectives.findIndex((o) => o.id === over.id);
    const reordered = [...objectives];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const updated = reordered.map((o, i) => ({ ...o, sort_order: i }));
    onObjectivesChange(updated);

    startTransition(async () => {
      await reorderObjectives(updated.map((o) => o.id));
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const id = await createObjective({ name: "New Objective" });
      const newObj: Objective = {
        id,
        name: "New Objective",
        description: null,
        ideas: null,
        hypothesis: null,
        other_notes: null,
        status: "active",
        retirement_note: null,
        progress_summary: null,
        current_priority: 0,
        needle_movement: 0,
        sort_order: objectives.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onObjectivesChange([...objectives, newObj]);
      onSelect(id);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between rounded-t-lg bg-primary px-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-primary-foreground">Objectives</h2>
          <div className="flex gap-0.5">
            {(["manual", "priority", "neglected"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={cn(
                  "cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  sortMode === mode
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="cursor-pointer rounded px-2 py-0.5 text-sm font-medium text-white/60 transition-colors hover:text-white hover:bg-white/10"
        >
          +
        </button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 py-2">
          <DndContext
            id="objectives-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedObjectives.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {sortedObjectives.map((objective) => (
                  <ObjectiveTile
                    key={objective.id}
                    objective={objective}
                    isSelected={objective.id === selectedId}
                    onClick={() => onSelect(objective.id)}
                    isDragDisabled={sortMode !== "manual"}
                    featuredActions={featuredActions[objective.id]}
                    onFeaturedActionClick={onFeaturedActionClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>
    </div>
  );
}
