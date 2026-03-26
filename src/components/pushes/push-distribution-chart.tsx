"use client";

export interface PushActionSlice {
  pushId: string;
  pushName: string;
  actionCount: number;
}

interface PushDistributionChartProps {
  slices: PushActionSlice[];
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function PushDistributionChart({ slices }: PushDistributionChartProps) {
  const total = slices.reduce((sum, s) => sum + s.actionCount, 0);

  if (total === 0) {
    return (
      <div className="flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-lg border bg-secondary/50 p-2.5">
        <p className="text-[11px] text-muted-foreground">No recent actions</p>
      </div>
    );
  }

  const percentages = slices.map((s) => (s.actionCount / total) * 100);

  // Build donut segments
  const cx = 50;
  const cy = 50;
  const r = 32;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = slices.map((slice, i) => {
    const pct = percentages[i];
    const dashLength = (pct / 100) * circumference;
    const dashOffset = -offset;
    offset += dashLength;
    return { slice, pct, dashLength, dashOffset, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  // Compute label positions at midpoint of each arc
  const labels: { x: number; y: number; pct: number }[] = [];
  let angleOffset = 0;
  for (const seg of segments) {
    const arcAngle = (seg.pct / 100) * 360;
    const midAngle = angleOffset + arcAngle / 2 - 90; // -90 to start from top
    const midRad = (midAngle * Math.PI) / 180;
    const labelR = r;
    labels.push({
      x: cx + labelR * Math.cos(midRad),
      y: cy + labelR * Math.sin(midRad),
      pct: seg.pct,
    });
    angleOffset += arcAngle;
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-secondary/50 p-2.5">
      <h3 className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        3-Week Focus
      </h3>
      <div className="mt-1 flex min-h-0 flex-1 items-center gap-2.5">
        {/* Donut chart */}
        <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0 -rotate-90">
          {segments.map((seg, i) => (
            <circle
              key={seg.slice.pushId}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={18}
              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
              strokeDashoffset={seg.dashOffset}
            />
          ))}
          {labels.map((label, i) =>
            label.pct >= 15 ? (
              <text
                key={i}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="rotate-90 fill-white text-[8px] font-mono"
                style={{ transformOrigin: `${label.x}px ${label.y}px` }}
              >
                {Math.round(label.pct)}%
              </text>
            ) : null
          )}
        </svg>

        {/* Legend */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {segments.map((seg) => (
            <div key={seg.slice.pushId} className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate text-[11px] text-muted-foreground">
                {seg.slice.pushName}
              </span>
              <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60">
                {Math.round(seg.pct)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
