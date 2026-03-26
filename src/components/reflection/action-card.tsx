"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Pencil } from "lucide-react";
import type { Database } from "@/types/database";

type Push = Database["public"]["Tables"]["pushes"]["Row"];
type Objective = Database["public"]["Tables"]["objectives"]["Row"];

type ActionStatus = "accepted" | "edited" | "rejected";

interface ActionData {
  id: string;
  description: string;
  needle_score: number;
  push_ids: string[];
  objective_ids: string[];
  status: ActionStatus;
}

interface ActionCardProps {
  action: ActionData;
  activePushes: Push[];
  activeObjectives: Objective[];
  onUpdate: (updated: ActionData) => void;
}

export function ActionCard({
  action,
  activePushes,
  activeObjectives,
  onUpdate,
}: ActionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(action.description);

  const isRejected = action.status === "rejected";

  const borderColor =
    action.status === "accepted"
      ? "border-green-300"
      : action.status === "edited"
        ? "border-amber-300"
        : "border-gray-200 opacity-50";

  function handleAccept() {
    onUpdate({ ...action, status: "accepted" });
  }

  function handleReject() {
    onUpdate({ ...action, status: "rejected" });
  }

  function handleSaveEdit() {
    setIsEditing(false);
    if (editDescription.trim() !== action.description) {
      onUpdate({
        ...action,
        description: editDescription.trim(),
        status: "edited",
      });
    }
  }

  function togglePush(pushId: string) {
    const newPushIds = action.push_ids.includes(pushId)
      ? action.push_ids.filter((id) => id !== pushId)
      : [...action.push_ids, pushId];
    onUpdate({
      ...action,
      push_ids: newPushIds,
      status: action.status === "rejected" ? "accepted" : "edited",
    });
  }

  function toggleObjective(objectiveId: string) {
    const newObjectiveIds = action.objective_ids.includes(objectiveId)
      ? action.objective_ids.filter((id) => id !== objectiveId)
      : [...action.objective_ids, objectiveId];
    onUpdate({
      ...action,
      objective_ids: newObjectiveIds,
      status: action.status === "rejected" ? "accepted" : "edited",
    });
  }

  function handleNeedleChange(value: number) {
    onUpdate({
      ...action,
      needle_score: value,
      status: action.status === "rejected" ? "accepted" : "edited",
    });
  }

  return (
    <div
      className={`rounded-lg border-2 ${borderColor} bg-white p-4 transition-all ${
        isRejected ? "line-through" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              autoFocus
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
              }}
            />
          ) : (
            <p
              className={`text-sm ${isRejected ? "text-muted-foreground" : ""}`}
            >
              {action.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          {!isRejected && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setIsEditing(true);
                setEditDescription(action.description);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {isRejected ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600"
              onClick={handleAccept}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={handleReject}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!isRejected && (
        <div className="mt-3 space-y-3">
          {/* Needle score */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Impact</span>
            <input
              type="range"
              min={0}
              max={100}
              value={action.needle_score}
              onChange={(e) => handleNeedleChange(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-primary"
            />
            <span className="w-8 text-right font-mono text-xs">
              {action.needle_score}
            </span>
          </div>

          {/* Pushes */}
          {activePushes.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Pushes</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {activePushes.map((push) => (
                  <Badge
                    key={push.id}
                    variant={
                      action.push_ids.includes(push.id)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer text-xs"
                    onClick={() => togglePush(push.id)}
                  >
                    {push.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Objectives */}
          {activeObjectives.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Objectives</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {activeObjectives.map((obj) => (
                  <Badge
                    key={obj.id}
                    variant={
                      action.objective_ids.includes(obj.id)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer text-xs"
                    onClick={() => toggleObjective(obj.id)}
                  >
                    {obj.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
