"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DetailPanel } from "@/components/layout/detail-panel";
import {
  updateObjective,
  retireObjective,
  deleteObjective,
  createTag,
  updateObjectiveTags,
} from "@/app/(dashboard)/first-principles/actions";
import type { Database } from "@/types/database";

type Objective = Database["public"]["Tables"]["objectives"]["Row"];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

interface ObjectiveDetailProps {
  objective: Objective | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (updated: Partial<Objective> & { id: string }) => void;
  onDeleted?: (id: string) => void;
  allTags: Tag[];
  objectiveTagIds: number[];
}

export function ObjectiveDetail({
  objective,
  open,
  onClose,
  onSaved,
  onDeleted,
  allTags,
  objectiveTagIds,
}: ObjectiveDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ideas, setIdeas] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [otherNotes, setOtherNotes] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [retirementNote, setRetirementNote] = useState("");
  const [showRetire, setShowRetire] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (objective) {
      setName(objective.name);
      setDescription(objective.description ?? "");
      setIdeas(objective.ideas ?? "");
      setHypothesis(objective.hypothesis ?? "");
      setOtherNotes(objective.other_notes ?? "");
      setSelectedTagIds(objectiveTagIds);
      setRetirementNote("");
      setShowRetire(false);
      setConfirmDelete(false);
    }
  }, [objective, objectiveTagIds]);

  if (!objective) return null;

  function saveAndClose() {
    // Update local state immediately
    onSaved?.({
      id: objective!.id,
      name,
      description: description || null,
      ideas: ideas || null,
      hypothesis: hypothesis || null,
      other_notes: otherNotes || null,
    });
    onClose();

    // Persist to server in background
    startTransition(async () => {
      await updateObjective(objective!.id, {
        name,
        description: description || null,
        ideas: ideas || null,
        hypothesis: hypothesis || null,
        other_notes: otherNotes || null,
      });
      await updateObjectiveTags(objective!.id, selectedTagIds);
    });
  }

  function handleRetire() {
    onDeleted?.(objective!.id);
    onClose();
    startTransition(async () => {
      await retireObjective(objective!.id, retirementNote);
    });
  }

  function handleDelete() {
    onDeleted?.(objective!.id);
    onClose();
    startTransition(async () => {
      await deleteObjective(objective!.id);
    });
  }

  function handleAddTag() {
    if (!newTagName.trim()) return;
    startTransition(async () => {
      const tagId = await createTag(newTagName.trim());
      setSelectedTagIds((prev) => [...prev, tagId]);
      setNewTagName("");
    });
  }

  function toggleTag(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  return (
    <DetailPanel open={open} onClose={saveAndClose} title="Edit Objective">
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
          <label className="text-xs font-medium text-muted-foreground">Ideas</label>
          <Textarea value={ideas} onChange={(e) => setIdeas(e.target.value)} rows={3} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Hypothesis</label>
          <Textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={3} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Other Notes</label>
          <Textarea value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} rows={3} />
        </div>

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground">Tags</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer transition-colors hover:bg-primary/80 hover:text-primary-foreground"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="New tag..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              className="h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={handleAddTag}>
              Add
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground">Progress Summary</label>
          <p className="mt-1 text-sm text-muted-foreground">
            {objective.progress_summary || "No data yet"}
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

        <div className="flex items-center gap-2">
          {!showRetire ? (
            <Button variant="destructive" size="sm" onClick={() => setShowRetire(true)}>
              Retire Objective
            </Button>
          ) : (
            <div className="w-full space-y-2">
              <Textarea
                placeholder="Retirement note..."
                value={retirementNote}
                onChange={(e) => setRetirementNote(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleRetire} disabled={isPending}>
                  Confirm Retire
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowRetire(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

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
