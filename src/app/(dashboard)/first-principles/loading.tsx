export default function Loading() {
  return (
    <div className="grid h-full grid-cols-[33%_1fr] gap-1.5 p-1.5">
      {/* Left column: objectives skeleton */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="h-10 rounded-t-lg bg-primary" />
        <div className="space-y-2 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>

      {/* Right column: todos + pushes */}
      <div className="grid min-h-0 grid-rows-[1fr_36vh] gap-1.5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="h-10 rounded-t-lg bg-primary" />
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="h-10 rounded-t-lg bg-primary" />
          <div className="grid grid-cols-3 grid-rows-2 gap-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
