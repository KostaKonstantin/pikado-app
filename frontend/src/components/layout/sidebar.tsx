'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import { useTheme } from '@/lib/theme-context';
import {
  Trophy, Users, BarChart3, Target, Calendar,
  Settings, LogOut, Swords, Home, X, Sun, Moon,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',   label: 'Pregled',     icon: Home,      disabled: false },
  { href: '/tournaments', label: 'Turniri',     icon: Trophy,    disabled: true  },
  { href: '/leagues',     label: 'Lige',        icon: Swords,    disabled: false },
  { href: '/players',     label: 'Igrači',      icon: Users,     disabled: false },
  { href: '/rankings',    label: 'Rang Lista',  icon: BarChart3, disabled: true  },
  { href: '/seasons',     label: 'Sezone',      icon: Calendar,  disabled: true  },
  { href: '/settings',    label: 'Podešavanja', icon: Settings,  disabled: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { club, user, logout } = useAuthStore();
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebarStore();
  const { theme, toggleTheme } = useTheme();

  const c = isCollapsed; // shorthand

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-fade-in"
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed left-0 top-0 h-full flex flex-col z-50',
          'transition-all duration-300 ease-in-out',
          c ? 'w-16' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
      >

        {/* ── Header ──────────────────────────────────────────── */}
        <div
          className="flex items-center h-14 md:h-16 shrink-0 px-4 gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Club logo / fallback icon — always present, centered when collapsed */}
          {(() => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3099';
            const logoSrc = club?.logoUrl
              ? club.logoUrl.startsWith('http') ? club.logoUrl : `${API_URL}${club.logoUrl}`
              : null;
            const initials = club?.name?.slice(0, 2).toUpperCase() || 'PK';
            return (
              <div className={`shrink-0 w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center ${c ? 'mx-auto' : ''}`}>
                {logoSrc ? (
                  <img src={logoSrc} alt={club?.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="gradient-accent w-full h-full flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Text — expanded only */}
          {!c && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                Pikado
              </h1>
              <p className="text-orange-400 text-xs font-medium truncate">{club?.name || 'Klub'}</p>
            </div>
          )}

          {/* Mobile: close button */}
          {!c && (
            <button
              onClick={close}
              className="lg:hidden p-1.5 rounded-lg transition-colors nav-link-default"
              aria-label="Zatvori meni"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Desktop collapse button — expanded only, in header */}
          {!c && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg transition-colors nav-link-default"
              aria-label="Skupi sidebar"
              title="Skupi sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Navigation ──────────────────────────────────────── */}
        <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden ${c ? 'px-2' : 'px-3'}`}>
          {/* Expand button — collapsed mode, desktop only */}
          {c && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex w-full justify-center p-3 rounded-lg transition-colors nav-link-default mb-1"
              aria-label="Proširi sidebar"
              title="Proširi sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {navItems.map(({ href, label, icon: Icon, disabled }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const baseClass = [
              'flex items-center rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97]',
              c ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
            ].join(' ');

            if (disabled) {
              return (
                <div
                  key={href}
                  title={c ? label : 'Uskoro dostupno'}
                  className={`${baseClass} cursor-not-allowed select-none opacity-40`}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!c && (
                    <>
                      <span>{label}</span>
                      <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide opacity-60">
                        Uskoro
                      </span>
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                title={c ? label : undefined}
                className={[
                  baseClass,
                  active
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20'
                    : 'nav-link-default',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!c && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer: user + theme + logout ───────────────────── */}
        <div
          className={`shrink-0 space-y-1 ${c ? 'px-2 py-3' : 'p-3'}`}
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* User info (expanded only) */}
          {!c && (
            <div className="flex items-center gap-3 px-2 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                {(user?.fullName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.fullName || user?.email}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {user?.email}
                </p>
              </div>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={c ? (theme === 'dark' ? 'Svetla tema' : 'Tamna tema') : undefined}
            className={`w-full flex items-center rounded-lg text-sm transition-all duration-150 active:scale-[0.97] nav-link-default
              ${c ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'}`}
          >
            {theme === 'dark'
              ? <Sun  className="w-4 h-4 text-orange-400 shrink-0" />
              : <Moon className="w-4 h-4 text-orange-400 shrink-0" />
            }
            {!c && (theme === 'dark' ? 'Svetla tema' : 'Tamna tema')}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title={c ? 'Odjavi se' : undefined}
            className={`w-full flex items-center text-sm transition-all duration-150 active:scale-[0.97] rounded-lg
              text-slate-400 hover:text-red-400 hover:bg-red-400/10
              ${c ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!c && 'Odjavi se'}
          </button>
        </div>
      </aside>
    </>
  );
}
