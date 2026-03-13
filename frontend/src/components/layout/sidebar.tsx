'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  Trophy, Users, BarChart3, Target, Calendar, Settings, LogOut, Swords, Home,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Pregled', icon: Home },
  { href: '/tournaments', label: 'Turniri', icon: Trophy },
  { href: '/leagues', label: 'Lige', icon: Swords },
  { href: '/players', label: 'Igrači', icon: Users },
  { href: '/rankings', label: 'Rang Lista', icon: BarChart3 },
  { href: '/seasons', label: 'Sezone', icon: Calendar },
  { href: '/settings', label: 'Podešavanja', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { club, user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">Pikado</h1>
            <p className="text-orange-400 text-xs font-medium truncate max-w-[120px]">
              {club?.name || 'Klub'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
            {user?.fullName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.fullName || user?.email}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Odjavi se
        </button>
      </div>
    </aside>
  );
}
