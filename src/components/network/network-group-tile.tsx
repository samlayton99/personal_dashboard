"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { Input } from "@/components/ui/input";
import { NetworkSectionColumn } from "./network-section";
import { NetworkContactItem } from "./network-contact-item";
import { NetworkMetWithSection } from "./network-met-with-section";
import {
  createContact,
  deleteContact,
  reorderContacts,
  markMetWith,
} from "@/app/(dashboard)/network/actions";
import { useRealtime } from "@/lib/supabase/use-realtime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type NetworkContact = Database["public"]["Tables"]["network_contacts"]["Row"];
type NetworkMeeting = Database["public"]["Tables"]["network_meetings"]["Row"];
type NetworkSection = Database["public"]["Enums"]["network_section"];
type NetworkGroup = Database["public"]["Tables"]["network_groups"]["Row"];

const SECTIONS: NetworkSection[] = ["queue", "waiting_on", "scheduled"];

interface NetworkGroupTileProps {
  group: NetworkGroup;
  initialContacts: NetworkContact[];
  initialMeetings: NetworkMeeting[];
  onDeleteGroup: (id: string) => void;
  onUpdateGroup: (id: string, name: string) => void;
}

export function NetworkGroupTile({
  group,
  initialContacts,
  initialMeetings,
  onDeleteGroup,
  onUpdateGroup,
}: NetworkGroupTileProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [meetings, setMeetings] = useState(initialMeetings);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [metWithId, setMetWithId] = useState<string | null>(null);
  const [metWithNotes, setMetWithNotes] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(group.name);
  const [, startTransition] = useTransition();

  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const pendingCreatesRef = useRef<Map<string, string>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeDragContact = activeDragId
    ? contacts.find((c) => c.id === activeDragId) ?? null
    : null;

  // Realtime: contacts
  useRealtime({
    table: "network_contacts",
    onPayload: useCallback(
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.eventType === "INSERT") {
          const newContact = payload.new as unknown as NetworkContact;
          if (newContact.group_id !== group.id) return;
          setContacts((prev) => {
            if (prev.some((c) => c.id === newContact.id)) return prev;
            const matchIdx = prev.findIndex(
              (c) =>
                c.id.startsWith("temp_") &&
                c.name === newContact.name &&
                c.section === newContact.section
            );
            if (matchIdx !== -1) {
              pendingCreatesRef.current.delete(prev[matchIdx].id);
              return prev.map((c, i) => (i === matchIdx ? newContact : c));
            }
            if (pendingDeletesRef.current.has(newContact.id)) return prev;
            return [...prev, newContact];
          });
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as unknown as NetworkContact;
          if (updated.group_id !== group.id) return;
          if (pendingDeletesRef.current.has(updated.id)) return;
          setContacts((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        } else if (payload.eventType === "DELETE") {
          const deleted = payload.old as unknown as { id: string };
          if (deleted.id) {
            pendingDeletesRef.current.delete(deleted.id);
            setContacts((prev) => prev.filter((c) => c.id !== deleted.id));
          }
        }
      },
      [group.id]
    ),
  });

  // Realtime: meetings
  useRealtime({
    table: "network_meetings",
    onPayload: useCallback(
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.eventType === "INSERT") {
          const newMeeting = payload.new as unknown as NetworkMeeting;
          if (newMeeting.group_id !== group.id) return;
          setMeetings((prev) => {
            if (prev.some((m) => m.id === newMeeting.id)) return prev;
            return [...prev, newMeeting];
          });
        }
      },
      [group.id]
    ),
  });

  function handleAdd(name: string, section: NetworkSection) {
    const tempId = `temp_${Date.now()}`;
    pendingCreatesRef.current.set(tempId, name);
    const newContact: NetworkContact = {
      id: tempId,
      group_id: group.id,
      name,
      section,
      sort_order: contacts.filter((c) => c.section === section).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setContacts((prev) => [...prev, newContact]);
    startTransition(async () => {
      try {
        const realId = await createContact({ group_id: group.id, name, section });
        pendingCreatesRef.current.delete(tempId);
        setContacts((prev) =>
          prev.map((c) => (c.id === tempId ? { ...c, id: realId } : c))
        );
      } catch {
        pendingCreatesRef.current.delete(tempId);
        setContacts((prev) => prev.filter((c) => c.id !== tempId));
      }
    });
  }

  function handleDelete(id: string) {
    pendingDeletesRef.current.add(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      try {
        await deleteContact(id);
      } finally {
        pendingDeletesRef.current.delete(id);
      }
    });
  }

  function handleMetWithClick(id: string) {
    setMetWithId(id);
    setMetWithNotes("");
  }

  function handleMetWithConfirm() {
    if (!metWithId) return;
    const id = metWithId;
    const notes = metWithNotes.trim();
    const contact = contacts.find((c) => c.id === id);

    // Optimistic: remove contact and add to meetings
    pendingDeletesRef.current.add(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (contact) {
      const optimisticMeeting: NetworkMeeting = {
        id: `temp_meeting_${Date.now()}`,
        contact_name: contact.name,
        group_name: group.name,
        group_id: group.id,
        section_at_meeting: contact.section,
        met_at: new Date().toISOString(),
        notes: notes || null,
        created_at: new Date().toISOString(),
      };
      setMeetings((prev) => [...prev, optimisticMeeting]);
    }

    setMetWithId(null);
    setMetWithNotes("");

    startTransition(async () => {
      try {
        await markMetWith(id, notes || undefined);
      } finally {
        pendingDeletesRef.current.delete(id);
      }
    });
  }

  function handleMetWithCancel() {
    setMetWithId(null);
    setMetWithNotes("");
  }

  // Drag-and-drop helpers
  function findSection(id: string): NetworkSection | null {
    // Check if ID is a droppable zone (groupId:section)
    const parts = (id as string).split(":");
    if (parts.length === 2 && SECTIONS.includes(parts[1] as NetworkSection)) {
      return parts[1] as NetworkSection;
    }
    const contact = contacts.find((c) => c.id === id);
    return contact?.section ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeSection = findSection(activeId);
    const overSection = findSection(overId);

    if (!activeSection || !overSection || activeSection === overSection) return;

    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, section: overSection } : c
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const overSection = findSection(overId);

    if (!overSection) return;

    let finalContacts = contacts.map((c) =>
      c.id === activeId ? { ...c, section: overSection } : c
    );

    // Reorder within section if dropping on another contact
    const overContact = contacts.find((c) => c.id === overId);
    if (overContact && activeId !== overId) {
      const sectionItems = finalContacts
        .filter((c) => c.section === overSection)
        .sort((a, b) => a.sort_order - b.sort_order);

      const oldIndex = sectionItems.findIndex((c) => c.id === activeId);
      const newIndex = sectionItems.findIndex((c) => c.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sectionItems, oldIndex, newIndex);
        const orderMap = new Map(reordered.map((c, i) => [c.id, i]));
        finalContacts = finalContacts.map((c) =>
          orderMap.has(c.id) ? { ...c, sort_order: orderMap.get(c.id)! } : c
        );
      }
    }

    setContacts(finalContacts);

    // Persist
    const sectionContacts = finalContacts
      .filter((c) => c.section === overSection)
      .sort((a, b) => a.sort_order - b.sort_order);

    const serverUpdates = sectionContacts.map((c, i) => ({
      id: c.id,
      section: overSection,
      sort_order: i,
    }));

    startTransition(() => reorderContacts(serverUpdates));
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  function handleNameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== group.name) {
      onUpdateGroup(group.id, trimmed);
    } else {
      setNameValue(group.name);
    }
    setEditingName(false);
  }

  const metWithContact = metWithId ? contacts.find((c) => c.id === metWithId) : null;

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between rounded-t-lg bg-primary px-3">
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSubmit();
              if (e.key === "Escape") {
                setNameValue(group.name);
                setEditingName(false);
              }
            }}
            className="bg-transparent text-sm font-semibold text-primary-foreground outline-none border-b border-primary-foreground/40 w-full mr-2"
          />
        ) : (
          <h2
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold text-primary-foreground cursor-pointer hover:opacity-80"
          >
            {group.name}
          </h2>
        )}
        <button
          onClick={() => onDeleteGroup(group.id)}
          className="text-primary-foreground/60 hover:text-primary-foreground transition-colors cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Met With inline prompt */}
      {metWithContact && (
        <div className="border-b px-3 py-2 bg-green-50 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Met with <span className="font-medium text-foreground">{metWithContact.name}</span>
          </span>
          <Input
            autoFocus
            placeholder="Notes (optional)"
            value={metWithNotes}
            onChange={(e) => setMetWithNotes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleMetWithConfirm();
              if (e.key === "Escape") handleMetWithCancel();
            }}
            className="h-6 text-xs flex-1"
          />
          <button
            onClick={handleMetWithConfirm}
            className="text-xs text-green-700 hover:text-green-900 font-medium cursor-pointer"
          >
            Log
          </button>
          <button
            onClick={handleMetWithCancel}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Sections grid */}
      <div className="min-h-0 flex-1 p-2">
        <DndContext
          id={`network-dnd-${group.id}`}
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid h-full grid-cols-3 gap-2" style={{ minHeight: "180px" }}>
            {SECTIONS.map((section) => (
              <NetworkSectionColumn
                key={section}
                section={section}
                groupId={group.id}
                contacts={contacts.filter((c) => c.section === section)}
                onAdd={handleAdd}
                onDelete={handleDelete}
                onMetWith={handleMetWithClick}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragContact ? (
              <NetworkContactItem
                contact={activeDragContact}
                onDelete={() => {}}
                onMetWith={() => {}}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Met With history */}
      <NetworkMetWithSection meetings={meetings} />
    </div>
  );
}
