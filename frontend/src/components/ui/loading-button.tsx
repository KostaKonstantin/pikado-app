'use client';
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './spinner';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidthOnMobile?: boolean;
  children: ReactNode;
}

const variantClasses: Record<NonNullable<LoadingButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold hover:opacity-90 border-0',
  secondary:
    'bg-[var(--bg-input)] text-[var(--text-primary)] font-medium border border-[var(--border)] hover:bg-[var(--border)]',
  danger:
    'bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold hover:opacity-90 border-0',
};

/**
 * Mobile-optimised loading button.
 *
 * - Minimum 44px tap target (touch-target)
 * - Shows spinner + short label while loading
 * - Disabled + pointer-events-none while loading (prevents double-tap)
 * - No layout shift when spinner appears
 */
export function LoadingButton({
  loading = false,
  loadingLabel,
  variant = 'primary',
  fullWidthOnMobile = false,
  disabled,
  className = '',
  children,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      className={[
        // Base
        'inline-flex items-center justify-center gap-2',
        'px-5 py-2.5 rounded-lg',
        'min-h-[44px]',
        'text-sm',
        'transition-opacity duration-150',
        'cursor-pointer select-none',
        // Disabled
        isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : '',
        // Variant
        variantClasses[variant],
        // Mobile full-width
        fullWidthOnMobile ? 'w-full sm:w-auto' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <>
          <Spinner size="xs" className="text-current" />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
