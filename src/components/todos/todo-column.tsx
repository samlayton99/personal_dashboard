"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { TodoItem } from "./todo-item";
import type { Database } from "@/types/database";

type Todo = Database["public"]["Tables"]["todos"]["Row"];
type Panel = Database["public"]["Enums"]["todo_panel"];

const panelLabels: Record<Panel, string> = {
  now: "NOW",
  in_progress: "IN PROGRESS",
  future: "FUTURE",
};

interface TodoColumnProps {
  panel: Panel;
  todos: Todo[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (description: string, panel: Panel) => void;
}

export function TodoColumn({ panel, todos, onToggle, onDelete, onAdd }: TodoColumnProps) {
  const [inputValue, setInputValue] = useState("");
  const { setNodeRef } = useDroppable({ id: panel });

  const sorted = [...todos].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return a.sort_order - b.sort_order;
  });

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && inputValue.trim()) {
      onAdd(inputValue.trim(), panel);
      setInputValue("");
    }
  }

  return (
    <div ref={setNodeRef} className="flex h-full min-h-0 flex-col rounded-md border bg-secondary/40">
      <div className="shrink-0 border-b px-3 py-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {panelLabels[panel]}
        </h3>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1 py-1">
          <SortableContext
            items={sorted.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {sorted.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t px-2 py-1.5">
        <Input
          placeholder="Add a to-do..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm"
        />
      </div>
    </div>
  );
}
