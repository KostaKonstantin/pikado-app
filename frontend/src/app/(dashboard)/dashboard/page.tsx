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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Turniri', value: stats.tournaments, icon: Trophy, color: 'text-orange-400', bg: 'bg-orange-500/10', href: '/tournaments' },
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
          {/* Recent Tournaments */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Poslednji Turniri</h3>
              <Link href="/tournaments" className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1">
                Svi turniri <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />)}
              </div>
            ) : recentTournaments.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Nema turnira</p>
                <Link href="/tournaments/new" className="btn-primary mt-3 text-sm">
                  Kreiraj Turnir
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTournaments.map((t) => (
                  <Link key={t.id} href={`/tournaments/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.format?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className={statusColor[t.status] || 'badge'}>{statusLabel[t.status] || t.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top Players */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Rang Lista</h3>
              <Link href="/rankings" className="text-orange-400 text-sm hover:text-orange-300 flex items-center gap-1">
                Cela lista <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" />)}
              </div>
            ) : topPlayers.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Nema podataka</p>
              </div>
            ) : (
              <div className="space-y-1">
                {topPlayers.map((r, i) => (
                  <div key={r.player?.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-500 text-black' :
                      i === 1 ? 'bg-slate-400 text-black' :
                      i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{r.player?.fullName || '—'}</p>
                      <p className="text-xs text-slate-400">{r.matchesPlayed} mečeva</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-400">{r.points} bod.</p>
                      <p className="text-xs text-slate-400">{r.winRate}% pobeda</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Brze Akcije</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/tournaments/new', label: 'Kreiraj Turnir', icon: Trophy },
              { href: '/leagues/new', label: 'Kreiraj Ligu', icon: Swords },
              { href: '/players/new', label: 'Dodaj Igrača', icon: Users },
              { href: '/rankings', label: 'Rang Lista', icon: BarChart3 },
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
