"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  updateObjective,
  resurrectObjective,
  deleteObjective,
  updatePush,
  resurrectPush,
  deletePush,
  deleteAction,
  deleteActions,
} from "@/app/(dashboard)/first-principles/actions";
import type { Database } from "@/types/database";

type Objective = Database["public"]["Tables"]["objectives"]["Row"];
type Push = Database["public"]["Tables"]["pushes"]["Row"];
type Action = Database["public"]["Tables"]["actions"]["Row"];

interface HistoryPageClientProps {
  objectives: Objective[];
  pushes: Push[];
  actions: Action[];
}

const tabs = ["Objectives", "Pushes", "Actions"] as const;
type Tab = (typeof tabs)[number];

type DeleteTarget =
  | { mode: "single"; id: string }
  | { mode: "bulk"; ids: string[] }
  | null;

export function HistoryPageClient({
  objectives: initialObjectives,
  pushes: initialPushes,
  actions: initialActions,
}: HistoryPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Objectives");
  const [search, setSearch] = useState("");
  const [objectives, setObjectives] = useState(initialObjectives);
  const [pushes, setPushes] = useState(initialPushes);
  const [actions, setActions] = useState(initialActions);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [selectedPushId, setSelectedPushId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => { setActions(initialActions); }, [initialActions]);

  const q = search.toLowerCase();

  const filteredObjectives = objectives.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      o.retirement_note?.toLowerCase().includes(q)
  );
  const filteredPushes = pushes.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.retirement_note?.toLowerCase().includes(q)
  );
  const filteredActions = actions
    .filter((a) => a.description.toLowerCase().includes(q))
    .filter((a) => !dateFrom || a.date >= dateFrom)
    .filter((a) => !dateTo || a.date <= dateTo);

  const hasActiveFilters = search !== "" || dateFrom !== "" || dateTo !== "";

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const idsToDelete = deleteTarget.mode === "single" ? [deleteTarget.id] : deleteTarget.ids;
    setActions((prev) => prev.filter((a) => !idsToDelete.includes(a.id)));
    setDeleteTarget(null);
    startDeleteTransition(async () => {
      if (idsToDelete.length === 1) {
        await deleteAction(idsToDelete[0]);
      } else {
        await deleteActions(idsToDelete);
      }
      router.refresh();
    });
  }

  const selectedObjective = objectives.find((o) => o.id === selectedObjectiveId) ?? null;
  const selectedPush = pushes.find((p) => p.id === selectedPushId) ?? null;

  function handleSelectObjective(id: string) {
    setSelectedPushId(null);
    setSelectedObjectiveId((prev) => (prev === id ? null : id));
  }

  function handleSelectPush(id: string) {
    setSelectedObjectiveId(null);
    setSelectedPushId((prev) => (prev === id ? null : id));
  }

  function handleObjectiveUpdated(updated: Objective) {
    setObjectives((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  function handleObjectiveRemoved(id: string) {
    setObjectives((prev) => prev.filter((o) => o.id !== id));
    setSelectedObjectiveId(null);
  }

  function handlePushUpdated(updated: Push) {
    setPushes((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handlePushRemoved(id: string) {
    setPushes((prev) => prev.filter((p) => p.id !== id));
    setSelectedPushId(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-1.5">
      <div className="relative flex h-full min-h-0 flex-col rounded-lg border bg-card">
        {/* Header */}
        <div className="flex h-10 shrink-0 items-center justify-between rounded-t-lg bg-primary px-3">
          <h2 className="text-sm font-semibold text-primary-foreground">
            History
          </h2>
          <Link
            href="/first-principles"
            className="cursor-pointer text-xs text-white/70 transition-colors hover:text-white"
          >
            Back
          </Link>
        </div>

        {/* Search + Tabs */}
        <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2">
          <div className="flex items-center gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedObjectiveId(null);
                  setSelectedPushId(null);
                }}
                className={
                  "cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition-colors " +
                  (activeTab === tab
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")
                }
              >
                {tab}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto w-64"
          />
        </div>

        {/* Date filter bar (Actions tab only) */}
        {activeTab === "Actions" && (
          <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-7 rounded-md border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-7 rounded-md border bg-background px-2 text-xs"
              />
            </label>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Clear
              </Button>
            )}
            {hasActiveFilters && filteredActions.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto"
                onClick={() =>
                  setDeleteTarget({
                    mode: "bulk",
                    ids: filteredActions.map((a) => a.id),
                  })
                }
              >
                Delete All ({filteredActions.length})
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="relative min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3">
              {activeTab === "Objectives" && (
                <>
                  {filteredObjectives.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No retired objectives
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredObjectives.map((obj) => (
                        <div
                          key={obj.id}
                          onClick={() => handleSelectObjective(obj.id)}
                          className={
                            "cursor-pointer rounded-lg border px-3 py-2.5 transition-colors " +
                            (selectedObjectiveId === obj.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "hover:bg-accent/50")
                          }
                        >
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm font-medium">{obj.name}</p>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDate(obj.updated_at)}
                            </span>
                          </div>
                          {obj.retirement_note && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {obj.retirement_note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "Pushes" && (
                <>
                  {filteredPushes.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No retired pushes
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredPushes.map((push) => (
                        <div
                          key={push.id}
                          onClick={() => handleSelectPush(push.id)}
                          className={
                            "cursor-pointer rounded-lg border px-3 py-2.5 transition-colors " +
                            (selectedPushId === push.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "hover:bg-accent/50")
                          }
                        >
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{push.name}</p>
                              {push.retirement_reason && (
                                <span className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                                  {push.retirement_reason}
                                </span>
                              )}
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDate(push.updated_at)}
                            </span>
                          </div>
                          {push.retirement_note && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {push.retirement_note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "Actions" && (
                <>
                  {filteredActions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No actions yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredActions.map((action) => (
                        <div
                          key={action.id}
                          className="group relative rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/50"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ mode: "single", id: action.id });
                            }}
                            className="absolute right-1.5 top-1.5 cursor-pointer rounded p-0.5 text-muted-foreground/50 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div className="flex items-baseline justify-between pr-5">
                            <p className="text-sm">{action.description}</p>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDate(action.date)}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Needle: {action.needle_score}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Detail panel overlay */}
          {selectedObjective && (
            <ObjectiveHistoryDetail
              objective={selectedObjective}
              onClose={() => setSelectedObjectiveId(null)}
              onUpdated={handleObjectiveUpdated}
              onRemoved={handleObjectiveRemoved}
            />
          )}
          {selectedPush && (
            <PushHistoryDetail
              push={selectedPush}
              onClose={() => setSelectedPushId(null)}
              onUpdated={handlePushUpdated}
              onRemoved={handlePushRemoved}
            />
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.mode === "bulk"
                ? `Delete ${deleteTarget.ids.length} Actions`
                : "Delete Action"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.mode === "bulk"
                ? `All ${deleteTarget.ids.length} filtered actions will be permanently deleted. This cannot be undone.`
                : "This action will be permanently deleted. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {deleteTarget?.mode === "bulk" ? "Delete All" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Objective detail overlay
// ============================================================

function ObjectiveHistoryDetail({
  objective,
  onClose,
  onUpdated,
  onRemoved,
}: {
  objective: Objective;
  onClose: () => void;
  onUpdated: (obj: Objective) => void;
  onRemoved: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(objective.name);
  const [description, setDescription] = useState(objective.description ?? "");
  const [ideas, setIdeas] = useState(objective.ideas ?? "");
  const [hypothesis, setHypothesis] = useState(objective.hypothesis ?? "");
  const [otherNotes, setOtherNotes] = useState(objective.other_notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmResurrect, setConfirmResurrect] = useState(false);

  function handleSave() {
    const updated: Objective = {
      ...objective,
      name,
      description: description || null,
      ideas: ideas || null,
      hypothesis: hypothesis || null,
      other_notes: otherNotes || null,
    };
    onUpdated(updated);
    onClose();
    startTransition(() =>
      updateObjective(objective.id, {
        name,
        description: description || null,
        ideas: ideas || null,
        hypothesis: hypothesis || null,
        other_notes: otherNotes || null,
      })
    );
  }

  function handleResurrect() {
    onRemoved(objective.id);
    startTransition(() => resurrectObjective(objective.id));
  }

  function handleDelete() {
    onRemoved(objective.id);
    startTransition(() => deleteObjective(objective.id));
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col rounded-b-lg bg-card shadow-lg">
      <div className="flex h-10 shrink-0 items-center justify-between bg-primary px-4">
        <h2 className="text-sm font-semibold text-primary-foreground">
          Edit Retired Objective
        </h2>
        <button
          onClick={onClose}
          className="cursor-pointer rounded p-0.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-5">
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

          {objective.retirement_note && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Retirement Note</label>
              <p className="mt-1 text-sm text-muted-foreground">{objective.retirement_note}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          <Separator />

          {!confirmResurrect ? (
            <Button size="sm" onClick={() => setConfirmResurrect(true)}>
              Resurrect Objective
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">This will make it active again.</span>
              <Button size="sm" onClick={handleResurrect} disabled={isPending}>
                Confirm
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmResurrect(false)}>
                Cancel
              </Button>
            </div>
          )}

          <div>
            {!confirmDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
      </ScrollArea>
    </div>
  );
}

// ============================================================
// Push detail overlay
// ============================================================

function PushHistoryDetail({
  push,
  onClose,
  onUpdated,
  onRemoved,
}: {
  push: Push;
  onClose: () => void;
  onUpdated: (p: Push) => void;
  onRemoved: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(push.name);
  const [description, setDescription] = useState(push.description ?? "");
  const [notes, setNotes] = useState(push.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmResurrect, setConfirmResurrect] = useState(false);

  function handleSave() {
    const updated: Push = {
      ...push,
      name,
      description: description || null,
      notes: notes || null,
    };
    onUpdated(updated);
    onClose();
    startTransition(() =>
      updatePush(push.id, {
        name,
        description: description || null,
        notes: notes || null,
      })
    );
  }

  function handleResurrect() {
    onRemoved(push.id);
    startTransition(() => resurrectPush(push.id));
  }

  function handleDelete() {
    onRemoved(push.id);
    startTransition(() => deletePush(push.id));
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col rounded-b-lg bg-card shadow-lg">
      <div className="flex h-10 shrink-0 items-center justify-between bg-primary px-4">
        <h2 className="text-sm font-semibold text-primary-foreground">
          Edit Retired Push
        </h2>
        <button
          onClick={onClose}
          className="cursor-pointer rounded p-0.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-5">
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

          {(push.retirement_reason || push.retirement_note) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Retirement Info</label>
              <div className="mt-1 flex items-center gap-2">
                {push.retirement_reason && (
                  <span className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {push.retirement_reason}
                  </span>
                )}
                {push.retirement_note && (
                  <span className="text-sm text-muted-foreground">{push.retirement_note}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          <Separator />

          {!confirmResurrect ? (
            <Button size="sm" onClick={() => setConfirmResurrect(true)}>
              Resurrect Push
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">This will make it active again.</span>
              <Button size="sm" onClick={handleResurrect} disabled={isPending}>
                Confirm
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmResurrect(false)}>
                Cancel
              </Button>
            </div>
          )}

          <div>
            {!confirmDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
      </ScrollArea>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
