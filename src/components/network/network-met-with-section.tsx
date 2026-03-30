"use client";

import { useState } from "react";
import type { Database } from "@/types/database";

type NetworkMeeting = Database["public"]["Tables"]["network_meetings"]["Row"];

interface NetworkMetWithSectionProps {
  meetings: NetworkMeeting[];
}

export function NetworkMetWithSection({ meetings }: NetworkMetWithSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (meetings.length === 0) return null;

  const sorted = [...meetings].sort(
    (a, b) => new Date(b.met_at).getTime() - new Date(a.met_at).getTime()
  );

  return (
    <div className="border-t">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:bg-accent/50 transition-colors cursor-pointer"
      >
        <svg
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Met With ({meetings.length})
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {sorted.map((meeting) => (
            <div key={meeting.id} className="flex items-baseline gap-2 text-[12px]">
              <span className="font-medium">{meeting.contact_name}</span>
              <span className="text-muted-foreground text-[10px]">
                {formatDate(meeting.met_at)}
              </span>
              {meeting.notes && (
                <span className="text-muted-foreground text-[11px] truncate">
                  - {meeting.notes}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
