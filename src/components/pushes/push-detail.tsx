"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DetailPanel } from "@/components/layout/detail-panel";
import {
  updatePush,
  updatePushObjectives,
  deletePush,
  retirePush,
} from "@/app/(dashboard)/first-principles/actions";
import type { Database } from "@/types/database";

type Push = Database["public"]["Tables"]["pushes"]["Row"];
type Objective = Database["public"]["Tables"]["objectives"]["Row"];

interface PushDetailProps {
  push: Push | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (updated: Partial<Push> & { id: string }) => void;
  onDeleted?: (id: string) => void;
  allObjectives: Objective[];
  linkedObjectiveIds: string[];
}

export function PushDetail({
  push,
  open,
  onClose,
  onSaved,
  onDeleted,
  allObjectives,
  linkedObjectiveIds,
}: PushDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRetire, setShowRetire] = useState(false);
  const [retireReason, setRetireReason] = useState<"completed" | "failed" | "na">("completed");
  const [retireNote, setRetireNote] = useState("");

  useEffect(() => {
    if (push) {
      setName(push.name);
      setDescription(push.description ?? "");
      setNotes(push.notes ?? "");
      setSelectedObjectiveIds(linkedObjectiveIds);
      setConfirmDelete(false);
      setShowRetire(false);
      setRetireNote("");
    }
  }, [push, linkedObjectiveIds]);

  if (!push) return null;

  function saveAndClose() {
    // Update local state immediately
    onSaved?.({
      id: push!.id,
      name,
      description: description || null,
      notes: notes || null,
    });
    onClose();

    // Persist to server in background
    startTransition(async () => {
      await updatePush(push!.id, {
        name,
        description: description || null,
        notes: notes || null,
      });
      await updatePushObjectives(push!.id, selectedObjectiveIds);
    });
  }

  function handleDelete() {
    onDeleted?.(push!.id);
    onClose();
    startTransition(async () => {
      await deletePush(push!.id);
    });
  }

  function handleRetire() {
    onDeleted?.(push!.id);
    onClose();
    startTransition(async () => {
      await retirePush(push!.id, retireReason, retireNote);
    });
  }

  function toggleObjective(id: string) {
    setSelectedObjectiveIds((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]
    );
  }

  return (
    <DetailPanel open={open} onClose={saveAndClose} title="Edit Push">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground">Linked Objectives</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {allObjectives
              .filter((o) => o.status === "active")
              .map((obj) => (
                <Badge
                  key={obj.id}
                  variant={selectedObjectiveIds.includes(obj.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors hover:bg-primary/80 hover:text-primary-foreground"
                  onClick={() => toggleObjective(obj.id)}
                >
                  {obj.name}
                </Badge>
              ))}
          </div>
        </div>

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground">Progress Summary</label>
          <p className="mt-1 text-sm text-muted-foreground">
            {push.progress_summary || "No data yet"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveAndClose} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Discard
          </Button>
        </div>

        <Separator />

        {!showRetire ? (
          <Button variant="destructive" size="sm" onClick={() => setShowRetire(true)}>
            Retire Push
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              {(["completed", "failed", "na"] as const).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={retireReason === r ? "default" : "outline"}
                  onClick={() => setRetireReason(r)}
                  className="text-xs"
                >
                  {r === "completed" ? "Completed" : r === "failed" ? "Failed" : "N/A"}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Retirement note..."
              value={retireNote}
              onChange={(e) => setRetireNote(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={handleRetire} disabled={isPending}>
                {isPending ? "Retiring..." : "Confirm Retire"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRetire(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div>
          {!confirmDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              Delete permanently
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">This cannot be undone.</span>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </DetailPanel>
  );
}
