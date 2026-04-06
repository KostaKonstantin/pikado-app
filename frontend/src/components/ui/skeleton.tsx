export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/** Skeleton for a single player row (avatar + name + stats) */
export function PlayerRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-4 w-32 max-w-[60%]" />
        <Skeleton className="h-3 w-20 max-w-[40%]" />
      </div>
      <div className="flex gap-3 ml-auto">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-8" />
      </div>
    </div>
  );
}

/** Skeleton for a list of players (e.g. players page, leaderboard) */
export function PlayerListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-(--border) flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="divide-y divide-(--border)">
        {Array.from({ length: rows }, (_, i) => (
          <PlayerRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a stats card */
export function StatCardSkeleton() {
  return (
    <div className="card p-4 space-y-2 animate-fade-in">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

/** Grid of 4 stat card skeletons */
export function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
      {[0, 1, 2, 3].map((i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function LeagueSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Tabs skeleton */}
      <div className="flex gap-1">
        {[80, 96, 72].map((w, i) => (
          <Skeleton key={i} className={`h-9 rounded-lg`} style={{ width: w }} />
        ))}
      </div>

      {/* Standings skeleton */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <div className="divide-y divide-slate-700/50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-4 flex-1 max-w-40" />
              <div className="ml-auto flex gap-4">
                {[24, 24, 24, 24, 32].map((w, j) => (
                  <Skeleton key={j} className="h-4" style={{ width: w }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
