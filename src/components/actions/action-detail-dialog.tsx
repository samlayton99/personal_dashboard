"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FeaturedAction } from "@/types/featured-actions";

interface ActionDetailDialogProps {
  action: FeaturedAction | null;
  open: boolean;
  onClose: () => void;
}

export function ActionDetailDialog({ action, open, onClose }: ActionDetailDialogProps) {
  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Action Detail</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm leading-relaxed">{action.description}</p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {new Date(action.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}{" "}
              ({action.days_ago === 0 ? "today" : `${action.days_ago}d ago`})
            </span>
            <span>Needle: {action.needle_score}%</span>
          </div>

          {action.linked_objective_names.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Objectives</p>
              <div className="flex flex-wrap gap-1">
                {action.linked_objective_names.map((name) => (
                  <Badge key={name} variant="secondary" className="text-[10px]">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {action.linked_push_names.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Pushes</p>
              <div className="flex flex-wrap gap-1">
                {action.linked_push_names.map((name) => (
                  <Badge key={name} variant="outline" className="text-[10px]">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
