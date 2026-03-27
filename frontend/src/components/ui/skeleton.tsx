export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} />;
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
              <Skeleton className="h-4 flex-1 max-w-[160px]" />
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
