'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import { Sidebar } from '@/components/layout/sidebar';
import { TopProgressBar } from '@/components/ui/top-progress-bar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { close, isCollapsed } = useSidebarStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { close(); }, [pathname]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen">
      <TopProgressBar />
      <Sidebar />
      <main
        className={`flex-1 min-h-screen w-full min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
