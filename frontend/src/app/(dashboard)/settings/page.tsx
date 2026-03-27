'use client';
import { useAuthStore } from '@/store/auth.store';
import { Topbar } from '@/components/layout/topbar';
import { User, Building2, Shield, LogOut, Mail, Hash, MapPin } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {value || <span className="opacity-40">—</span>}
      </span>
    </div>
  );
}

function SectionCard({ icon: Icon, iconColor, iconBg, title, children }: {
  icon: any; iconColor: string; iconBg: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="card p-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-2xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, club, role, logout } = useAuthStore();

  const roleLabels: Record<string, { label: string; desc: string }> = {
    club_admin: { label: 'Administrator Kluba', desc: 'Pun pristup – upravljanje klubom, ligama i igračima' },
    organizer: { label: 'Organizator', desc: 'Možete unositi rezultate i upravljati mečevima' },
    viewer: { label: 'Pregledač', desc: 'Samo pregled podataka' },
  };

  const roleInfo = roleLabels[role || ''] || { label: role || '', desc: '' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar title="Podešavanja" />

      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

        {/* User profile card */}
        <div className="card p-6 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-xl font-bold text-orange-400 shrink-0">
              {(user?.fullName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
                {user?.fullName || 'Korisnik'}
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <InfoRow label="Email adresa" value={user?.email} />
            <InfoRow label="Ime i Prezime" value={user?.fullName} />
          </div>
        </div>

        {/* Club info */}
        <SectionCard icon={Building2} iconColor="text-blue-400" iconBg="bg-blue-500/10" title="Klub">
          <InfoRow label="Naziv kluba" value={club?.name} />
          <div className="flex items-center justify-between py-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Slug</span>
            <code
              className="text-xs font-mono px-2 py-0.5 rounded-md"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {club?.slug}
            </code>
          </div>
        </SectionCard>

        {/* Role */}
        <SectionCard icon={Shield} iconColor="text-purple-400" iconBg="bg-purple-500/10" title="Ovlašćenja" >
          <div className="flex items-start gap-3 py-2">
            <span className="badge badge-active mt-0.5">{roleInfo.label}</span>
            <p className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{roleInfo.desc}</p>
          </div>
        </SectionCard>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 animate-fade-in-up stagger-4 font-medium text-sm"
          style={{ borderColor: 'rgba(239,68,68,0.25)' }}
        >
          <LogOut className="w-4 h-4" />
          Odjavi se
        </button>
      </div>
    </div>
  );
}
