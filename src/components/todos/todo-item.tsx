"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Todo = Database["public"]["Tables"]["todos"]["Row"];

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
}

export function TodoItem({ todo, onToggle, onDelete, isDragOverlay }: TodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragOverlay) {
    return (
      <div className="flex items-start gap-2 rounded-md border bg-card px-2 py-0.5 text-[13px] shadow-md">
        <div className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          todo.is_completed ? "border-primary bg-primary" : "border-muted-foreground/40"
        )}>
          {todo.is_completed && (
            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className={cn("flex-1 leading-tight", todo.is_completed && "line-through")}>
          {todo.description}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-start gap-2 rounded-md px-2 py-0.5 text-[13px] cursor-grab transition-colors hover:bg-accent/50 active:cursor-grabbing",
        isDragging && "opacity-30",
        todo.is_completed && "opacity-60"
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(todo.id, !todo.is_completed);
        }}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all hover:scale-110",
          todo.is_completed
            ? "border-primary bg-primary"
            : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
        )}
      >
        {todo.is_completed && (
          <svg
            className="h-2.5 w-2.5 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={cn("flex-1 leading-tight", todo.is_completed && "line-through")}>
        {todo.description}
      </span>
      {todo.source === "openclaw" && (
        <span className="shrink-0 text-[10px] text-muted-foreground">bot</span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
        className="shrink-0 cursor-pointer text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!text-destructive"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
