'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLoadingStore } from '@/store/loading.store';

type BarState = 'hidden' | 'loading' | 'completing';

/**
 * Thin top progress bar that activates on:
 *  1. Route changes (usePathname)
 *  2. Global API activity (useLoadingStore)
 *
 * No layout shift — fixed positioned at top of viewport.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const apiCount = useLoadingStore((s) => s.count);
  const [barState, setBarState] = useState<BarState>('hidden');
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = apiCount > 0;

  // Route change → flash the bar briefly
  useEffect(() => {
    setBarState('loading');
    completeTimer.current = setTimeout(() => {
      setBarState('completing');
      hideTimer.current = setTimeout(() => setBarState('hidden'), 350);
    }, 250);

    return () => {
      if (completeTimer.current) clearTimeout(completeTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // API activity → show bar while requests are in-flight
  useEffect(() => {
    if (isActive) {
      if (completeTimer.current) clearTimeout(completeTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setBarState('loading');
    } else {
      // When all requests finish, complete the bar then hide
      completeTimer.current = setTimeout(() => {
        setBarState('completing');
        hideTimer.current = setTimeout(() => setBarState('hidden'), 350);
      }, 100);
    }

    return () => {
      if (completeTimer.current) clearTimeout(completeTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isActive]);

  if (barState === 'hidden') return null;

  return (
    <div
      aria-hidden="true"
      className="top-progress-bar"
      data-state={barState}
    />
  );
}
