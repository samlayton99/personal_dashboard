"use client";

import { useState, useRef, useTransition, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useDndSensors } from "@/lib/hooks/use-dnd-sensors";
import { TodoColumn } from "./todo-column";
import { TodoItem } from "./todo-item";
import {
  createTodo,
  toggleTodoComplete,
  deleteTodo,
  reorderTodos,
} from "@/app/(dashboard)/first-principles/actions";
import { useRealtime } from "@/lib/supabase/use-realtime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createTempId, isTempId } from "@/lib/utils/temp-id";

type Todo = Database["public"]["Tables"]["todos"]["Row"];
type Panel = Database["public"]["Enums"]["todo_panel"];

interface TodosPanelProps {
  initialTodos: Todo[];
}

export function TodosPanel({ initialTodos }: TodosPanelProps) {
  const [todos, setTodos] = useState(initialTodos);

  // Track in-flight operations so we don't clobber optimistic state
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const pendingCreatesRef = useRef<Map<string, string>>(new Map()); // tempId -> description

  // Sync local state when server props change, but respect in-flight operations
  useEffect(() => {
    setTodos((prev) => {
      // If nothing is in flight, trust the server
      if (pendingDeletesRef.current.size === 0 && pendingCreatesRef.current.size === 0) {
        return initialTodos;
      }
      // Merge: use server data but preserve optimistic deletes and pending creates
      const merged = initialTodos.filter((t) => !pendingDeletesRef.current.has(t.id));
      // Re-add any temp todos that haven't been resolved yet
      const tempTodos = prev.filter((t) => isTempId(t.id));
      for (const temp of tempTodos) {
        if (!merged.some((t) => t.id === temp.id)) {
          merged.push(temp);
        }
      }
      return merged;
    });
  }, [initialTodos]);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dragSourcePanel = useRef<Panel | null>(null);

  const sensors = useDndSensors();

  const activeDragTodo = activeDragId ? todos.find((t) => t.id === activeDragId) ?? null : null;

  const nowTodos = todos.filter((t) => t.panel === "now");
  const inProgressTodos = todos.filter((t) => t.panel === "in_progress");
  const futureTodos = todos.filter((t) => t.panel === "future");

  useRealtime({
    table: "todos",
    onPayload: useCallback(
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.eventType === "INSERT") {
          const newTodo = payload.new as unknown as Todo;
          setTodos((prev) => {
            // Already have this exact ID
            if (prev.some((t) => t.id === newTodo.id)) return prev;
            // Check if this INSERT matches a pending optimistic create (temp_ todo)
            const matchIdx = prev.findIndex(
              (t) => isTempId(t.id) && t.description === newTodo.description && t.panel === newTodo.panel
            );
            if (matchIdx !== -1) {
              // Swap the temp todo for the real one from the server
              pendingCreatesRef.current.delete(prev[matchIdx].id);
              return prev.map((t, i) => (i === matchIdx ? newTodo : t));
            }
            // Skip if this ID was already deleted optimistically
            if (pendingDeletesRef.current.has(newTodo.id)) return prev;
            return [...prev, newTodo];
          });
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as unknown as Todo;
          // Skip updates for items we've optimistically deleted
          if (pendingDeletesRef.current.has(updated.id)) return;
          setTodos((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          );
        } else if (payload.eventType === "DELETE") {
          const deleted = payload.old as unknown as { id: string };
          if (deleted.id) {
            pendingDeletesRef.current.delete(deleted.id);
            setTodos((prev) => prev.filter((t) => t.id !== deleted.id));
          }
        }
      },
      []
    ),
  });

  function handleToggle(id: string, completed: boolean) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, is_completed: completed, date_completed: completed ? new Date().toISOString() : null }
          : t
      )
    );
    startTransition(() => toggleTodoComplete(id, completed));
  }

  function handleDelete(id: string) {
    pendingDeletesRef.current.add(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      try {
        await deleteTodo(id);
      } finally {
        // Clean up after server confirms (realtime DELETE will also clean up)
        pendingDeletesRef.current.delete(id);
      }
    });
  }

  function handleAdd(description: string, panel: Panel) {
    const tempId = createTempId("todo");
    pendingCreatesRef.current.set(tempId, description);
    const panelTodos = todos.filter((t) => t.panel === panel && !t.is_completed);
    const maxSortOrder = panelTodos.length > 0
      ? Math.max(...panelTodos.map((t) => t.sort_order))
      : -1;
    const newTodo: Todo = {
      id: tempId,
      description,
      push_id: null,
      source: "manual",
      priority: 5,
      panel,
      is_completed: false,
      due_date: null,
      sort_order: maxSortOrder + 1,
      date_added: new Date().toISOString(),
      date_completed: null,
    };
    setTodos((prev) => [...prev, newTodo]);
    startTransition(async () => {
      try {
        const realId = await createTodo({ description, panel });
        pendingCreatesRef.current.delete(tempId);
        setTodos((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: realId } : t)));
      } catch {
        // Roll back the optimistic add on failure
        pendingCreatesRef.current.delete(tempId);
        setTodos((prev) => prev.filter((t) => t.id !== tempId));
      }
    });
  }

  function findPanel(id: string): Panel | null {
    if (["now", "in_progress", "future"].includes(id)) return id as Panel;
    const todo = todos.find((t) => t.id === id);
    return todo?.panel ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveDragId(id);
    const todo = todos.find((t) => t.id === id);
    dragSourcePanel.current = todo?.panel ?? null;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activePanel = findPanel(activeId);
    const overPanel = findPanel(overId);

    if (!activePanel || !overPanel || activePanel === overPanel) return;

    setTodos((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, panel: overPanel } : t
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const overPanel = findPanel(overId);

    if (!overPanel) return;

    let finalTodos = todos.map((t) =>
      t.id === activeId ? { ...t, panel: overPanel } : t
    );

    // Reorder within the panel if dropping on another todo
    const overTodo = todos.find((t) => t.id === overId);
    if (overTodo && activeId !== overId) {
      const panelItems = finalTodos
        .filter((t) => t.panel === overPanel && !t.is_completed)
        .sort((a, b) => a.sort_order - b.sort_order);

      const oldIndex = panelItems.findIndex((t) => t.id === activeId);
      const newIndex = panelItems.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(panelItems, oldIndex, newIndex);
        const orderMap = new Map(reordered.map((t, i) => [t.id, i]));
        finalTodos = finalTodos.map((t) =>
          orderMap.has(t.id) ? { ...t, sort_order: orderMap.get(t.id)! } : t
        );
      }
    }

    setTodos(finalTodos);

    // Persist to server after state is set
    const panelTodos = finalTodos
      .filter((t) => t.panel === overPanel && !t.is_completed)
      .sort((a, b) => a.sort_order - b.sort_order);

    const serverUpdates = panelTodos.map((t, i) => ({
      id: t.id,
      panel: overPanel,
      sort_order: i,
    }));

    startTransition(() => reorderTodos(serverUpdates));
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center rounded-t-lg bg-primary px-3">
        <h2 className="text-sm font-semibold text-primary-foreground">To-Dos</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <DndContext
          id="todos-dnd"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-2">
            <div className="row-span-2 min-h-0">
              <TodoColumn
                panel="now"
                todos={nowTodos}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onAdd={handleAdd}
              />
            </div>
            <div className="min-h-0">
              <TodoColumn
                panel="in_progress"
                todos={inProgressTodos}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onAdd={handleAdd}
              />
            </div>
            <div className="min-h-0">
              <TodoColumn
                panel="future"
                todos={futureTodos}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onAdd={handleAdd}
              />
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragTodo ? (
              <TodoItem
                todo={activeDragTodo}
                onToggle={() => {}}
                onDelete={() => {}}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
