"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Database } from "@/types/database";
import type { FeaturedAction } from "@/types/featured-actions";
import { cn } from "@/lib/utils";

type Objective = Database["public"]["Tables"]["objectives"]["Row"];

interface ObjectiveTileProps {
  objective: Objective;
  isSelected?: boolean;
  onClick: () => void;
  isDragDisabled?: boolean;
  featuredActions?: FeaturedAction[];
  onFeaturedActionClick?: (action: FeaturedAction) => void;
}

export function ObjectiveTile({
  objective,
  isSelected,
  onClick,
  isDragDisabled,
  featuredActions = [],
  onFeaturedActionClick,
}: ObjectiveTileProps) {
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
        "cursor-pointer rounded-lg border px-3 py-3 transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "bg-card hover:bg-accent/50",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{objective.name}</p>
          {featuredActions.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {featuredActions.map((action) => (
                <button
                  key={action.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFeaturedActionClick?.(action);
                  }}
                  className="flex w-full cursor-pointer items-start gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span className="min-w-0 text-xs leading-snug text-muted-foreground">
                    {action.description}{" "}
                    <span className="text-muted-foreground/60">
                      ({action.days_ago === 0 ? "today" : `${action.days_ago}d ago`})
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          <div className="text-right">
            <span className="text-base font-semibold leading-none">{Math.round(objective.current_priority)}%</span>
            <p className="text-[10px] text-muted-foreground">priority</p>
          </div>
          <div className="text-right">
            <span className="text-base font-semibold leading-none">{Math.round(objective.needle_movement)}%</span>
            <p className="text-[10px] text-muted-foreground">needle</p>
          </div>
        </div>
      </div>
    </div>
  );
}
