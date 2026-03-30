"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { NetworkContactItem } from "./network-contact-item";
import type { Database } from "@/types/database";

type NetworkContact = Database["public"]["Tables"]["network_contacts"]["Row"];
type NetworkSection = Database["public"]["Enums"]["network_section"];

const sectionLabels: Record<NetworkSection, string> = {
  queue: "QUEUE",
  waiting_on: "WAITING ON",
  scheduled: "SCHEDULED",
};

interface NetworkSectionProps {
  section: NetworkSection;
  groupId: string;
  contacts: NetworkContact[];
  onAdd: (name: string, section: NetworkSection) => void;
  onDelete: (id: string) => void;
  onMetWith: (id: string) => void;
}

export function NetworkSectionColumn({
  section,
  groupId,
  contacts,
  onAdd,
  onDelete,
  onMetWith,
}: NetworkSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const droppableId = `${groupId}:${section}`;
  const { setNodeRef } = useDroppable({ id: droppableId });

  const sorted = [...contacts].sort((a, b) => a.sort_order - b.sort_order);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && inputValue.trim()) {
      onAdd(inputValue.trim(), section);
      setInputValue("");
    }
  }

  return (
    <div ref={setNodeRef} className="flex h-full min-h-0 flex-col rounded-md border bg-secondary/40">
      <div className="shrink-0 border-b px-3 py-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {sectionLabels[section]}
        </h3>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1 py-1">
          <SortableContext
            items={sorted.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {sorted.map((contact) => (
              <NetworkContactItem
                key={contact.id}
                contact={contact}
                onDelete={onDelete}
                onMetWith={onMetWith}
              />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t px-2 py-1.5">
        <Input
          placeholder="Add name..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm"
        />
      </div>
    </div>
  );
}
