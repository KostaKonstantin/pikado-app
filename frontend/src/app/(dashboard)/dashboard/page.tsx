'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { tournamentsApi } from '@/lib/api/tournaments.api';
import { leaguesApi } from '@/lib/api/leagues.api';
import { playersApi } from '@/lib/api/players.api';
import { rankingsApi } from '@/lib/api/rankings.api';
import { Topbar } from '@/components/layout/topbar';
import { Trophy, Users, Swords, BarChart3, ArrowRight, Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';

function SkeletonStatCard() {
  return (
    <div className="stat-card p-6">
      <div className="skeleton h-3 w-20 mb-4 rounded" />
      <div className="skeleton h-8 w-14 mb-2 rounded" />
      <div className="skeleton h-3 w-24 rounded" />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color, bg, href, loading, delay = 0,
}: {
  label: string; value: number; icon: any; color: string; bg: string;
  href: string; loading: boolean; delay?: number;
}) {
  return (
    <Link
      href={href}
      className="stat-card p-6 block group animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          {loading ? (
            <div className="skeleton h-9 w-14 rounded" />
          ) : (
            <p className="text-4xl font-bold leading-none animate-count-up" style={{ color: 'var(--text-primary)' }}>
              {value}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-4">
        <span className="text-xs font-medium text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          Prikaži sve <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { club, user } = useAuthStore();
  const [stats, setStats] = useState({ leagues: 0, players: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club?.id) return;
    Promise.all([
      leaguesApi.getAll(club.id),
      playersApi.getAll(club.id),
    ]).then(([leagues, players]) => {
      setStats({ leagues: leagues.length || 0, players: players.length || 0 });
    }).catch(console.error).finally(() => setLoading(false));
  }, [club?.id]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Dobro jutro';
    if (h < 18) return 'Dobar dan';
    return 'Dobro veče';
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar title="Pregled" />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

        {/* Welcome banner */}
        <div className="animate-fade-in-up">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {greeting}{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 👋
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {club?.name} · Pregled aktivnosti kluba
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {loading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard label="Aktivne Lige" value={stats.leagues} icon={Swords} color="text-blue-400" bg="bg-blue-500/10" href="/leagues" loading={loading} delay={0} />
              <StatCard label="Igrači" value={stats.players} icon={Users} color="text-emerald-400" bg="bg-emerald-500/10" href="/players" loading={loading} delay={80} />
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-5 animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Brze Akcije
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/leagues/new', label: 'Kreiraj Ligu', desc: 'Nova sezona', icon: Swords, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { href: '/players/new', label: 'Dodaj Igrača', desc: 'Registracija', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            ].map((action, i) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 hover:border-orange-500/40 hover:shadow-sm"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                    {action.label}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {action.desc}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 ml-auto shrink-0 opacity-0 group-hover:opacity-100 text-orange-400 transition-all -translate-x-1 group-hover:translate-x-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Coming soon cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-4">
          {[
            { icon: Trophy, label: 'Turniri', desc: 'Bracket sistem, eliminacije, grupne faze' },
            { icon: BarChart3, label: 'Rang Lista', desc: 'ELO rejtinzi, statistike, trendovi' },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="card p-5 opacity-60 relative overflow-hidden"
            >
              {/* Subtle shimmer bg */}
              <div className="absolute inset-0 opacity-[0.02] gradient-accent rounded-xl" />
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</h3>
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    >
                      Uskoro
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
