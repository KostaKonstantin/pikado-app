'use client';
import { useAuthStore } from '@/store/auth.store';
import { Topbar } from '@/components/layout/topbar';
import { Settings, Shield, Users, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, club, role, logout } = useAuthStore();

  const roleLabels: Record<string, string> = {
    club_admin: 'Administrator Kluba',
    organizer: 'Organizator',
    viewer: 'Pregledač',
  };

  return (
    <div>
      <Topbar title="Podešavanja" />
      <div className="p-6 max-w-2xl space-y-6">
        {/* User Info */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" /> Korisnički Nalog
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Email</span>
              <span className="text-white">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ime</span>
              <span className="text-white">{user?.fullName || '—'}</span>
            </div>
          </div>
        </div>

        {/* Club Info */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" /> Klub
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Naziv</span>
              <span className="text-white">{club?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Slug</span>
              <span className="text-slate-300 font-mono">{club?.slug}</span>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" /> Ovlašćenja
          </h3>
          <div className="flex items-center gap-3">
            <span className="badge badge-active">{roleLabels[role || ''] || role}</span>
            <p className="text-sm text-slate-400">
              {role === 'club_admin' && 'Pun pristup – upravljanje klubom, turnirima, ligama i igračima'}
              {role === 'organizer' && 'Možete unositi rezultate i upravljati mečevima'}
              {role === 'viewer' && 'Samo pregled podataka'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" /> Odjavi se
        </button>
      </div>
    </div>
  );
}
