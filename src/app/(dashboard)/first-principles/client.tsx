"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getLastLockBoundary } from "@/lib/utils/lock";
import { ObjectivesPanel } from "@/components/objectives/objectives-panel";
import { ObjectiveDetail } from "@/components/objectives/objective-detail";
import { TodosPanel } from "@/components/todos/todos-panel";
import { PushesPanel } from "@/components/pushes/pushes-panel";
import { PushDetail } from "@/components/pushes/push-detail";
import { LockOverlay } from "@/components/reflection/lock-overlay";
import { ActionDetailDialog } from "@/components/actions/action-detail-dialog";
import { useRealtime } from "@/lib/supabase/use-realtime";
import type { Database } from "@/types/database";
import type { FeaturedAction } from "@/types/featured-actions";
import { CHART_COLORS, type PushActionSlice } from "@/components/pushes/push-distribution-chart";

type Objective = Database["public"]["Tables"]["objectives"]["Row"];
type Tag = Database["public"]["Tables"]["tags"]["Row"];
type Todo = Database["public"]["Tables"]["todos"]["Row"];
type Push = Database["public"]["Tables"]["pushes"]["Row"];
type SystemState = Database["public"]["Tables"]["system_state"]["Row"];

interface FirstPrinciplesClientProps {
  objectives: Objective[];
  tags: Tag[];
  objectiveTagMap: Record<string, number[]>;
  todos: Todo[];
  pushes: Push[];
  pushObjectiveMap: Record<string, string[]>;
  objectiveNameMap: Record<string, string>;
  systemState: SystemState | null;
  pushActionDistribution: PushActionSlice[];
  objectiveFeaturedActions: Record<string, FeaturedAction[]>;
  pushFeaturedActions: Record<string, FeaturedAction[]>;
}

export function FirstPrinciplesClient({
  objectives: initialObjectives,
  tags,
  objectiveTagMap: initialObjectiveTagMap,
  todos: initialTodos,
  pushes: initialPushes,
  pushObjectiveMap: initialPushObjectiveMap,
  systemState,
  pushActionDistribution,
  objectiveFeaturedActions,
  pushFeaturedActions,
}: FirstPrinciplesClientProps) {
  const [objectives, setObjectives] = useState(initialObjectives);
  const [pushes, setPushes] = useState(initialPushes);
  const [pushObjectiveMap, setPushObjectiveMap] = useState(initialPushObjectiveMap);
  const [todos, setTodos] = useState(initialTodos);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [selectedPushId, setSelectedPushId] = useState<string | null>(null);
  const [selectedFeaturedAction, setSelectedFeaturedAction] = useState<FeaturedAction | null>(null);

  // Sync local state when server props change (e.g. after navigation)
  useEffect(() => { setObjectives(initialObjectives); }, [initialObjectives]);
  useEffect(() => { setPushes(initialPushes); }, [initialPushes]);
  useEffect(() => { setPushObjectiveMap(initialPushObjectiveMap); }, [initialPushObjectiveMap]);
  useEffect(() => { setTodos(initialTodos); }, [initialTodos]);
  const lastClosedRef = useRef<{ id: string; time: number } | null>(null);

  // Lock state
  const [lastReflectionDate, setLastReflectionDate] = useState(
    systemState?.last_reflection_date ?? null
  );
  const [isLocked, setIsLocked] = useState(systemState?.is_locked ?? false);

  // Lock-checking interval is handled by LockWatcher in the dashboard layout.
  // This component only reacts to DB changes via realtime subscription below.

  // Listen for realtime system_state changes (edge function backup)
  useRealtime({
    table: "system_state",
    event: "UPDATE",
    onPayload: useCallback((payload: { new: Record<string, unknown> }) => {
      const newState = payload.new as unknown as SystemState;
      if (newState.is_locked) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
        setLastReflectionDate(newState.last_reflection_date);
      }
    }, []),
  });

  async function handleUnlock() {
    setIsLocked(false);

    // Refresh objectives (metrics recomputed) and todos (flush completed
    // ones outside the lock boundary). Client-side fetch keeps the Next.js
    // router free for immediate tab navigation.
    const supabase = createBrowserSupabaseClient();
    const [objectivesRes, todosRes] = await Promise.all([
      supabase
        .from("objectives")
        .select("*")
        .eq("status", "active")
        .order("sort_order"),
      supabase
        .from("todos")
        .select("*")
        .or(`is_completed.eq.false,date_completed.gte.${getLastLockBoundary()}`)
        .order("sort_order"),
    ]);

    if (objectivesRes.data) setObjectives(objectivesRes.data);
    if (todosRes.data) setTodos(todosRes.data);
  }

  const selectedObjective = objectives.find((o) => o.id === selectedObjectiveId) ?? null;
  const selectedPush = pushes.find((p) => p.id === selectedPushId) ?? null;

  // Live name map from current objectives state
  const objectiveNameMap: Record<string, string> = {};
  for (const obj of objectives) {
    objectiveNameMap[obj.id] = obj.name;
  }

  function wasJustClosed(id: string): boolean {
    if (!lastClosedRef.current) return false;
    return lastClosedRef.current.id === id && Date.now() - lastClosedRef.current.time < 200;
  }

  const handleSelectObjective = useCallback((id: string) => {
    if (wasJustClosed(id)) return;
    setSelectedPushId(null);
    setSelectedObjectiveId(id);
  }, []);

  const handleSelectPush = useCallback((id: string) => {
    if (wasJustClosed(id)) return;
    setSelectedObjectiveId(null);
    setSelectedPushId(id);
  }, []);

  function handleObjectiveSaved(updated: Partial<Objective> & { id: string }) {
    setObjectives((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
    );
  }

  function handleObjectiveDeleted(id: string) {
    setObjectives((prev) => prev.filter((o) => o.id !== id));
    setSelectedObjectiveId(null);
    // Clean up push-objective links that reference the deleted objective
    setPushObjectiveMap((prev) => {
      const updated = { ...prev };
      for (const pushId of Object.keys(updated)) {
        updated[pushId] = updated[pushId].filter((oid) => oid !== id);
      }
      return updated;
    });
  }

  function handlePushSaved(updated: Partial<Push> & { id: string }) {
    setPushes((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
  }

  function handlePushDeleted(id: string) {
    setPushes((prev) => prev.filter((p) => p.id !== id));
    setSelectedPushId(null);
    // Clean up the push-objective map entry
    setPushObjectiveMap((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }

  return (
    <div className="relative grid h-full grid-cols-[33%_1fr] gap-1.5 p-1.5">
      {isLocked && (
        <LockOverlay
          lastReflectionDate={lastReflectionDate}
          activePushes={pushes.filter((p) => p.status === "active")}
          activeObjectives={objectives.filter((o) => o.status === "active")}
          onUnlock={handleUnlock}
        />
      )}

      {/* Left column: Objectives (full height) */}
      <div className="min-h-0 overflow-hidden rounded-lg border bg-card">
        <ObjectivesPanel
          objectives={objectives}
          selectedId={selectedObjectiveId}
          onObjectivesChange={setObjectives}
          onSelect={handleSelectObjective}
          featuredActions={objectiveFeaturedActions}
          onFeaturedActionClick={setSelectedFeaturedAction}
        />
      </div>

      {/* Right column: Todos on top, Pushes on bottom */}
      <div className="relative grid min-h-0 grid-rows-[1fr_36vh] gap-1.5">

        {/* Todos panel */}
        <div className="relative min-h-0 overflow-hidden rounded-lg border bg-card">
          <TodosPanel initialTodos={todos} />
          <Link
            href="/first-principles/history"
            className="absolute right-3 top-1.5 cursor-pointer text-xs text-white/70 transition-colors hover:text-white"
          >
            History
          </Link>

          {/* Push detail overlays the todos panel */}
          {selectedPushId && (() => {
            const activeSorted = pushes
              .filter((p) => p.status === "active")
              .sort((a, b) => a.sort_order - b.sort_order);
            const pushIndex = activeSorted.findIndex((p) => p.id === selectedPushId);
            const pushColor = pushIndex >= 0 ? CHART_COLORS[pushIndex % CHART_COLORS.length] : undefined;
            return (
              <PushDetail
                push={selectedPush}
                open={selectedPushId !== null}
                onClose={() => {
                  lastClosedRef.current = { id: selectedPushId!, time: Date.now() };
                  setSelectedPushId(null);
                }}
                onSaved={handlePushSaved}
                onDeleted={handlePushDeleted}
                allObjectives={objectives}
                linkedObjectiveIds={selectedPushId ? (pushObjectiveMap[selectedPushId] ?? []) : []}
                color={pushColor}
              />
            );
          })()}
        </div>

        {/* Pushes panel */}
        <div className="min-h-0 overflow-hidden rounded-lg border bg-card">
          <PushesPanel
            pushes={pushes}
            selectedId={selectedPushId}
            onPushesChange={setPushes}
            onSelect={handleSelectPush}
            pushObjectiveMap={pushObjectiveMap}
            objectiveNameMap={objectiveNameMap}
            pushActionDistribution={pushActionDistribution}
            featuredActions={pushFeaturedActions}
            onFeaturedActionClick={setSelectedFeaturedAction}
          />
        </div>

        {/* Objective detail overlays the entire right column */}
        {selectedObjectiveId && (
          <ObjectiveDetail
            objective={selectedObjective}
            open={selectedObjectiveId !== null}
            onClose={() => {
              lastClosedRef.current = { id: selectedObjectiveId!, time: Date.now() };
              setSelectedObjectiveId(null);
            }}
            onSaved={handleObjectiveSaved}
            onDeleted={handleObjectiveDeleted}
            allTags={tags}
            objectiveTagIds={selectedObjectiveId ? (initialObjectiveTagMap[selectedObjectiveId] ?? []) : []}
          />
        )}
      </div>

      <ActionDetailDialog
        action={selectedFeaturedAction}
        open={selectedFeaturedAction !== null}
        onClose={() => setSelectedFeaturedAction(null)}
      />
    </div>
  );
}
