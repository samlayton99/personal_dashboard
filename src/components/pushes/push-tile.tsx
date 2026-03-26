"use client";

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
}

export function PushTile({
  push,
  isSelected,
  linkedObjectiveNames,
  onClick,
  featuredActions = [],
  onFeaturedActionClick,
}: PushTileProps) {
  return (
    <div
      className={cn(
        "relative flex h-full cursor-pointer flex-col rounded-lg border transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "bg-card hover:bg-accent/50 hover:border-border/80"
      )}
      onClick={onClick}
    >
      <div className="flex-1 p-3">
        <p className="truncate text-sm font-medium leading-tight">{push.name}</p>

        {featuredActions.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
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
