'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { tournamentsApi } from '@/lib/api/tournaments.api';
import { leaguesApi } from '@/lib/api/leagues.api';
import { playersApi } from '@/lib/api/players.api';
import { rankingsApi } from '@/lib/api/rankings.api';
import { Topbar } from '@/components/layout/topbar';
import { Trophy, Users, Swords, BarChart3, ArrowRight, Target } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { club } = useAuthStore();
  const [stats, setStats] = useState({ tournaments: 0, leagues: 0, players: 0 });
  const [recentTournaments, setRecentTournaments] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club?.id) return;
    Promise.all([
      tournamentsApi.getAll(club.id),
      leaguesApi.getAll(club.id),
      playersApi.getAll(club.id),
      rankingsApi.get(club.id),
    ]).then(([tournaments, leagues, players, rankings]) => {
      setStats({
        tournaments: tournaments.length || 0,
        leagues: leagues.length || 0,
        players: players.length || 0,
      });
      setRecentTournaments((tournaments || []).slice(0, 3));
      setTopPlayers((rankings || []).slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, [club?.id]);

  const statusLabel: Record<string, string> = {
    draft: 'Nacrt',
    registration: 'Registracija',
    in_progress: 'U toku',
    completed: 'Završen',
  };

  const statusColor: Record<string, string> = {
    draft: 'badge text-slate-400 bg-slate-800',
    registration: 'badge badge-active',
    in_progress: 'badge badge-win',
    completed: 'badge text-slate-400 bg-slate-800',
  };

  return (
    <div>
      <Topbar title="Pregled" />
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Lige', value: stats.leagues, icon: Swords, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/leagues' },
            { label: 'Igrači', value: stats.players, icon: Users, color: 'text-green-400', bg: 'bg-green-500/10', href: '/players' },
          ].map((stat) => (
            <Link key={stat.label} href={stat.href} className="card p-6 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{loading ? '—' : stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coming soon: Tournaments */}
          <div className="card p-6 opacity-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-slate-500" /> Poslednji Turniri
              </h3>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide border border-slate-700 px-2 py-0.5 rounded-full">Uskoro</span>
            </div>
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">Funkcionalnost u pripremi</p>
            </div>
          </div>

          {/* Coming soon: Rankings */}
          <div className="card p-6 opacity-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" /> Rang Lista
              </h3>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide border border-slate-700 px-2 py-0.5 rounded-full">Uskoro</span>
            </div>
            <div className="text-center py-8">
              <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">Funkcionalnost u pripremi</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Brze Akcije</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/leagues/new', label: 'Kreiraj Ligu', icon: Swords },
              { href: '/players/new', label: 'Dodaj Igrača', icon: Users },
            ].map((action) => (
              <Link key={action.href} href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-center">
                <action.icon className="w-6 h-6 text-orange-400" />
                <span className="text-sm text-slate-300 font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
