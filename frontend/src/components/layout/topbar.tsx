'use client';
import { Bell, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

interface TopbarProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  const { club } = useAuthStore();

  return (
    <header className="h-16 bg-[#1e293b]/80 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {club?.name}
        </div>
      </div>
    </header>
  );
}
