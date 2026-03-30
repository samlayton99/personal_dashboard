"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";
import type { FeaturedAction } from "@/types/featured-actions";

type Push = Database["public"]["Tables"]["pushes"]["Row"];

interface PushTileProps {
  push: Push;
  isSelected?: boolean;
  linkedObjectiveNames: string[];
  onClick: () => void;
  featuredActions?: FeaturedAction[];
  onFeaturedActionClick?: (action: FeaturedAction) => void;
  color?: string;
}

export function PushTile({
  push,
  isSelected,
  linkedObjectiveNames,
  onClick,
  featuredActions = [],
  onFeaturedActionClick,
  color,
}: PushTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: push.id });

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
      className={cn(
        "relative flex h-full cursor-grab flex-col overflow-hidden rounded-lg border transition-all",
        isDragging && "z-50 opacity-80 shadow-lg",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "bg-card hover:bg-accent/50 hover:border-border/80"
      )}
      onClick={onClick}
    >
      {color && (
        <div
          className="flex h-6 shrink-0 items-center px-2"
          style={{ backgroundColor: color }}
        >
          <span className="truncate rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold leading-none text-foreground">
            {push.name}
          </span>
        </div>
      )}

      <div className="flex-1 p-3">
        {!color && (
          <p className="truncate text-sm font-medium leading-tight">{push.name}</p>
        )}

        {featuredActions.length > 0 && (
          <div className={cn("space-y-0.5", color ? "" : "mt-1.5")}>
            {featuredActions.map((action) => (
              <button
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onFeaturedActionClick?.(action);
                }}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                <span className="truncate text-[11px] leading-snug text-muted-foreground">
                  {action.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {linkedObjectiveNames.length > 0 && (
        <div className="border-t px-3 py-1.5">
          <div className="flex flex-wrap gap-1">
            {linkedObjectiveNames.map((name) => (
              <Badge key={name} variant="secondary" className="text-[10px]">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
