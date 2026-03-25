"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type Objective = Database["public"]["Tables"]["objectives"]["Row"];

interface ObjectiveTileProps {
  objective: Objective;
  isSelected?: boolean;
  onClick: () => void;
  isDragDisabled?: boolean;
}

export function ObjectiveTile({ objective, isSelected, onClick, isDragDisabled }: ObjectiveTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: objective.id,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border px-3 py-5 transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "bg-card hover:bg-accent/50",
        isDragging && "opacity-50"
      )}
    >
      <p className="text-sm font-medium leading-snug">{objective.name}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>Priority: {Math.round(objective.current_priority)}%</span>
        <span>Needle: {Math.round(objective.needle_movement)}%</span>
      </div>
    </div>
  );
}
