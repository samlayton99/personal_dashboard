"use client";

import { useState, useTransition, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NetworkGroupTile } from "./network-group-tile";
import {
  createGroup,
  deleteGroup,
  updateGroup,
} from "@/app/(dashboard)/network/actions";
import { useRealtime } from "@/lib/supabase/use-realtime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type NetworkGroup = Database["public"]["Tables"]["network_groups"]["Row"];
type NetworkContact = Database["public"]["Tables"]["network_contacts"]["Row"];
type NetworkMeeting = Database["public"]["Tables"]["network_meetings"]["Row"];

interface NetworkPanelProps {
  initialGroups: NetworkGroup[];
  initialContacts: NetworkContact[];
  initialMeetings: NetworkMeeting[];
}

export function NetworkPanel({
  initialGroups,
  initialContacts,
  initialMeetings,
}: NetworkPanelProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [, startTransition] = useTransition();

  // Realtime: groups
  useRealtime({
    table: "network_groups",
    onPayload: useCallback(
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.eventType === "INSERT") {
          const newGroup = payload.new as unknown as NetworkGroup;
          setGroups((prev) => {
            if (prev.some((g) => g.id === newGroup.id)) return prev;
            // Replace temp group if matching name
            const matchIdx = prev.findIndex(
              (g) => g.id.startsWith("temp_") && g.name === newGroup.name
            );
            if (matchIdx !== -1) {
              return prev.map((g, i) => (i === matchIdx ? newGroup : g));
            }
            return [...prev, newGroup];
          });
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as unknown as NetworkGroup;
          setGroups((prev) =>
            prev.map((g) => (g.id === updated.id ? updated : g))
          );
        } else if (payload.eventType === "DELETE") {
          const deleted = payload.old as unknown as { id: string };
          if (deleted.id) {
            setGroups((prev) => prev.filter((g) => g.id !== deleted.id));
          }
        }
      },
      []
    ),
  });

  function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) return;

    const tempId = `temp_${Date.now()}`;
    const newGroup: NetworkGroup = {
      id: tempId,
      name,
      sort_order: groups.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setGroups((prev) => [...prev, newGroup]);
    setNewGroupName("");
    setShowNewGroup(false);

    startTransition(async () => {
      try {
        const realId = await createGroup(name);
        setGroups((prev) =>
          prev.map((g) => (g.id === tempId ? { ...g, id: realId } : g))
        );
      } catch {
        setGroups((prev) => prev.filter((g) => g.id !== tempId));
      }
    });
  }

  function handleDeleteGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    startTransition(() => deleteGroup(id));
  }

  function handleUpdateGroup(id: string, name: string) {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, name } : g))
    );
    startTransition(() => updateGroup(id, name));
  }

  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">Network</h1>
        {showNewGroup ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              placeholder="Group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateGroup();
                if (e.key === "Escape") {
                  setShowNewGroup(false);
                  setNewGroupName("");
                }
              }}
              className="h-7 w-48 text-sm"
            />
            <Button size="xs" onClick={handleCreateGroup}>
              Create
            </Button>
          </div>
        ) : (
          <Button size="xs" variant="outline" onClick={() => setShowNewGroup(true)}>
            + New Group
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4 pt-2">
        {sortedGroups.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">
              No groups yet. Create one to start tracking your network.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {sortedGroups.map((group) => (
              <NetworkGroupTile
                key={group.id}
                group={group}
                initialContacts={initialContacts.filter(
                  (c) => c.group_id === group.id
                )}
                initialMeetings={initialMeetings.filter(
                  (m) => m.group_id === group.id
                )}
                onDeleteGroup={handleDeleteGroup}
                onUpdateGroup={handleUpdateGroup}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
