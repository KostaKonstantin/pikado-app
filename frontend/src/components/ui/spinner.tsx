'use client';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** When true, wraps in a centered div with orange glow — for page-level use */
  centered?: boolean;
}

const config: Record<SpinnerSize, { px: number; stroke: number }> = {
  xs: { px: 14, stroke: 2 },
  sm: { px: 18, stroke: 2.5 },
  md: { px: 28, stroke: 3 },
  lg: { px: 44, stroke: 3.5 },
};

export function Spinner({ size = 'md', className = '', centered = false }: SpinnerProps) {
  const { px, stroke } = config[size];
  const r = (px - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dasharray = `${(circ * 0.76).toFixed(2)} ${(circ * 0.24).toFixed(2)}`;
  const cx = px / 2;
  const cy = px / 2;

  const svg = (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      fill="none"
      className={`animate-spin shrink-0 ${className}`}
      style={{ animationDuration: '0.7s', animationTimingFunction: 'linear' }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeOpacity={0.15}
      />
      {/* Arc */}
      <circle
        cx={cx} cy={cy} r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={dasharray}
      />
    </svg>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
          {svg}
        </div>
      </div>
    );
  }

  return svg;
}

/** Full-page centered spinner with backdrop — for first-load states */
export function PageSpinner() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]">
          <Spinner size="lg" />
        </div>
        <p className="text-sm text-[var(--text-secondary)] animate-pulse">Loading…</p>
      </div>
    </div>
  );
}

/** Inline card-level spinner — centered in a container */
export function CardSpinner({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12"
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <div className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">
        <Spinner size="md" />
      </div>
      {label && (
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      )}
    </div>
  );
}
