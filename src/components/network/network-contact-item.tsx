"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type NetworkContact = Database["public"]["Tables"]["network_contacts"]["Row"];

interface NetworkContactItemProps {
  contact: NetworkContact;
  onDelete: (id: string) => void;
  onMetWith: (id: string) => void;
  isDragOverlay?: boolean;
}

export function NetworkContactItem({
  contact,
  onDelete,
  onMetWith,
  isDragOverlay,
}: NetworkContactItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragOverlay) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-0.5 text-[13px] shadow-md">
        <span className="flex-1 leading-tight">{contact.name}</span>
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
        "group flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] cursor-grab transition-colors hover:bg-accent/50 active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      <span className="flex-1 truncate leading-tight">{contact.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMetWith(contact.id);
        }}
        title="Met with"
        className="shrink-0 cursor-pointer text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!text-green-600"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(contact.id);
        }}
        title="Delete"
        className="shrink-0 cursor-pointer text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!text-destructive"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
