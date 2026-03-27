'use client';
import { Menu, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import { useTheme } from '@/lib/theme-context';

interface TopbarProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  const { club } = useAuthStore();
  const { toggle } = useSidebarStore();
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="h-14 md:h-16 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-30"
      style={{
        backgroundColor: 'var(--bg-topbar)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="lg:hidden p-2 -ml-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors active:scale-[0.92] shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2
          className="text-base md:text-lg font-semibold truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
      </div>

      {/* Right: actions + club name + theme toggle */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        <div
          className="hidden sm:flex items-center gap-2 text-xs shrink-0"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="max-w-[140px] truncate">{club?.name}</span>
        </div>

        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Svetla tema' : 'Tamna tema'}
          className="p-2 rounded-lg border transition-all duration-200 active:scale-[0.92] group"
          style={{
            color: 'var(--text-secondary)',
            borderColor: 'var(--border)',
            backgroundColor: 'var(--bg-input)',
          }}
        >
          {theme === 'dark'
            ? <Sun  className="w-4 h-4 group-hover:text-orange-400 transition-colors" />
            : <Moon className="w-4 h-4 group-hover:text-orange-400 transition-colors" />
          }
        </button>
      </div>
    </header>
  );
}
