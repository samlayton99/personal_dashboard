"use client";

interface ScoreboardProps {
  streak: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
}

export function Scoreboard({
  streak,
  actionsThisWeek,
  actionsThisMonth,
}: ScoreboardProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-secondary/50 p-2.5">
      <h3 className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Scoreboard
      </h3>
      <div className="mt-auto flex shrink-0 flex-col gap-1">
        <ScoreRow label="Streak" value={streak} suffix="d" />
        <ScoreRow label="Week" value={actionsThisWeek} />
        <ScoreRow label="Month" value={actionsThisMonth} />
      </div>
    </div>
  );
}

function ScoreRow({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-semibold tabular-nums">
        {value}{suffix}
      </span>
    </div>
  );
}
