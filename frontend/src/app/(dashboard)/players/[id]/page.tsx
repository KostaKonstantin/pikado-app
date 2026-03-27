'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { ArrowLeft, Trophy, Swords, Target, Pencil, X, Check, Loader2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function SkeletonDetail() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="skeleton h-5 w-24 rounded" />
      <div className="card p-6">
        <div className="flex items-center gap-5">
          <div className="skeleton w-20 h-20 rounded-full shrink-0" />
          <div className="space-y-2">
            <div className="skeleton h-7 w-44 rounded" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function PlayerDetailPage() {
  const params = useParams();
  const { club } = useAuthStore();
  const id = params.id as string;
  const [player, setPlayer] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', nickname: '', country: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!club?.id) return;
    Promise.all([
      playersApi.getOne(club.id, id),
      playersApi.getStats(club.id, id),
      playersApi.getHistory(club.id, id),
    ]).then(([p, s, h]) => {
      setPlayer(p); setStats(s); setHistory(h);
    }).finally(() => setLoading(false));
  }, [club?.id, id]);

  const startEdit = () => {
    setEditForm({ fullName: player.fullName, nickname: player.nickname || '', country: player.country || '' });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!club?.id) return;
    setSaving(true);
    try {
      const updated = await playersApi.update(club.id, id, editForm);
      setPlayer(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  // Avatar color based on name
  const avatarLetter = player?.fullName?.[0]?.toUpperCase() || '?';

  const chartData = stats ? [
    { name: 'Pobede', value: stats.wins, color: '#22c55e' },
    { name: 'Remiji', value: stats.draws, color: '#94a3b8' },
    { name: 'Porazi', value: stats.losses, color: '#ef4444' },
  ] : [];

  if (loading) return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar title="Profil Igrača" />
      <SkeletonDetail />
    </div>
  );
  if (!player) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar title={player.fullName} />

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">

        {/* Back link */}
        <Link
          href="/players"
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-orange-400 animate-fade-in"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Svi igrači
        </Link>

        {/* Profile Card */}
        <div className="card p-6 animate-fade-in-up">
          {!editing ? (
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-orange-500/20 border-2 border-orange-500/25 flex items-center justify-center text-3xl font-bold text-orange-400 shrink-0">
                  {avatarLetter}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{player.fullName}</h2>
                {player.nickname && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    "{player.nickname}"
                  </p>
                )}
                {player.country && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{player.country}</p>
                )}
              </div>
              <button
                onClick={startEdit}
                className="p-2 rounded-xl transition-all hover:bg-orange-500/10 hover:text-orange-400 shrink-0"
                style={{ color: 'var(--text-secondary)' }}
                title="Uredi igrača"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Uredi igrača</p>
              <div className="space-y-3">
                <div>
                  <label className="form-label">Ime i prezime *</label>
                  <input className="input-field" value={editForm.fullName}
                    onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Nadimak</label>
                    <input className="input-field" value={editForm.nickname} placeholder="Opcionalno"
                      onChange={(e) => setEditForm((f) => ({ ...f, nickname: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Zemlja</label>
                    <input className="input-field" value={editForm.country} placeholder="Opcionalno"
                      onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveEdit}
                  disabled={saving || !editForm.fullName.trim()}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Čuvanje...' : 'Sačuvaj'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm flex items-center gap-1.5">
                  <X className="w-4 h-4" /> Otkaži
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up stagger-2">
            {[
              { label: 'Mečevi', value: stats.matchesPlayed, color: 'text-slate-400', bg: 'bg-slate-500/10' },
              { label: 'Pobede', value: stats.wins, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Porazi', value: stats.losses, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: '% Pobeda', value: `${stats.winRate}%`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            ].map((s, i) => (
              <div
                key={s.label}
                className="card p-4 text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                  <TrendingUp className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {stats && stats.matchesPlayed > 0 && (
          <div className="card p-6 animate-fade-in-up stagger-3">
            <h3 className="font-semibold mb-5 text-sm uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Statistika Mečeva
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={40}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--text-secondary)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Match History */}
        {history && (
          <div className="card overflow-hidden animate-fade-in-up stagger-4">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Istorija Mečeva
              </h3>
            </div>
            {history.leagueMatches?.length === 0 && history.tournamentMatches?.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nema odigranih mečeva</p>
              </div>
            ) : (
              <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as any}>
                {(history.leagueMatches || []).slice(0, 10).map((m: any) => {
                  const won = m.winnerId === id;
                  const draw = !m.winnerId && m.status === 'completed';
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <div className="flex-1 min-w-0">
                        <span style={{ color: 'var(--text-primary)' }}>
                          {m.homePlayer?.fullName}
                        </span>
                        <span className="mx-2 text-xs" style={{ color: 'var(--text-secondary)' }}>vs</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {m.awayPlayer?.fullName}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {m.homeSets} : {m.awaySets}
                      </span>
                      <span className={`badge shrink-0 ${won ? 'badge-win' : draw ? 'badge-draw' : 'badge-loss'}`}>
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
