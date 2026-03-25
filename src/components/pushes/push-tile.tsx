"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Push = Database["public"]["Tables"]["pushes"]["Row"];

interface PushTileProps {
  push: Push;
  isSelected?: boolean;
  linkedObjectiveNames: string[];
  onClick: () => void;
}

export function PushTile({ push, isSelected, linkedObjectiveNames, onClick }: PushTileProps) {
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
      <div className="flex items-start justify-between p-3 pb-0">
        <p className="text-sm font-medium leading-tight">{push.name}</p>
      </div>

      <div className="flex-1 p-3 pt-2">
        {linkedObjectiveNames.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {linkedObjectiveNames.map((name) => (
              <Badge key={name} variant="secondary" className="text-[10px]">
                {name}
              </Badge>
            ))}
          </div>
        )}
        {push.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {push.description}
          </p>
        )}
      </div>
    </div>
  );
}
