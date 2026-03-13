'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { ArrowLeft, Trophy, Swords, Target } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PlayerDetailPage() {
  const params = useParams();
  const { club } = useAuthStore();
  const id = params.id as string;
  const [player, setPlayer] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club?.id) return;
    Promise.all([
      playersApi.getOne(club.id, id),
      playersApi.getStats(club.id, id),
      playersApi.getHistory(club.id, id),
    ]).then(([p, s, h]) => {
      setPlayer(p);
      setStats(s);
      setHistory(h);
    }).finally(() => setLoading(false));
  }, [club?.id, id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Učitavanje...</div>;
  if (!player) return null;

  const chartData = stats ? [
    { name: 'Pobede', value: stats.wins, color: '#22c55e' },
    { name: 'Porazi', value: stats.losses, color: '#ef4444' },
    { name: 'Remiji', value: stats.draws, color: '#94a3b8' },
  ] : [];

  return (
    <div>
      <Topbar title={player.fullName} />
      <div className="p-6 space-y-6">
        <Link href="/players" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Svi igrači
        </Link>

        {/* Profile Card */}
        <div className="card p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-500/30 flex items-center justify-center text-3xl font-bold text-orange-400">
            {player.fullName[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{player.fullName}</h2>
            {player.nickname && <p className="text-slate-400">"{player.nickname}"</p>}
            {player.country && <p className="text-sm text-slate-500 mt-1">{player.country}</p>}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Mečevi', value: stats.matchesPlayed, icon: Target },
              { label: 'Pobede', value: stats.wins, icon: Trophy, color: 'text-green-400' },
              { label: 'Porazi', value: stats.losses, icon: Swords, color: 'text-red-400' },
              { label: '% Pobeda', value: `${stats.winRate}%`, icon: BarChart, color: 'text-orange-400' },
            ].map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {stats && stats.matchesPlayed > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4">Statistika Mečeva</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Match History */}
        {history && (
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4">Istorija Mečeva</h3>
            {history.leagueMatches?.length === 0 && history.tournamentMatches?.length === 0 ? (
              <p className="text-slate-400 text-sm">Nema odigranih mečeva</p>
            ) : (
              <div className="space-y-2">
                {(history.leagueMatches || []).slice(0, 10).map((m: any) => {
                  const isHome = m.homePlayerId === id;
                  const won = m.winnerId === id;
                  const draw = !m.winnerId && m.status === 'completed';
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg text-sm">
                      <span className="text-slate-300">{m.homePlayer?.fullName} vs {m.awayPlayer?.fullName}</span>
                      <span className="text-slate-400">{m.homeSets} : {m.awaySets}</span>
                      <span className={`badge ${won ? 'badge-win' : draw ? 'badge-draw' : 'badge-loss'}`}>
                        {won ? 'Pobeda' : draw ? 'Remi' : 'Poraz'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
