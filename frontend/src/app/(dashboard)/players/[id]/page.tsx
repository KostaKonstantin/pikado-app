'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { leaguesApi } from '@/lib/api/leagues.api';
import { Topbar } from '@/components/layout/topbar';
import {
  ArrowLeft, Pencil, X, Check, Loader2, TrendingUp,
  Swords, ChevronDown, ChevronRight, ChevronUp,
  Home, Car, HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ─── helpers ──────────────────────────────────────────────────────── */
function avatarRarity(name: string): 'common' | 'rare' | 'epic' | 'legendary' {
  const h = Array.from(name || '').reduce((acc, c) => ((acc * 31) + c.charCodeAt(0)) & 0xffff, 7) % 100;
  if (h >= 97) return 'legendary';
  if (h >= 85) return 'epic';
  if (h >= 60) return 'rare';
  return 'common';
}
const RARITY_RING: Record<string, string> = {
  legendary: 'ring-2 ring-yellow-400/80 shadow-lg shadow-yellow-400/30',
  epic:      'ring-2 ring-violet-500/70 shadow-lg shadow-violet-500/20',
  rare:      'ring-2 ring-blue-400/60',
  common:    '',
};
function Avatar({ name, size = 'sm' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const seed = encodeURIComponent(name || '?');
  const src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
  const rarity = avatarRarity(name || '');
  const sz = size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-10 h-10' : 'w-7 h-7';
  const rounded = size === 'lg' ? 'rounded-2xl' : 'rounded-full';
  return (
    <div className={`relative ${sz} ${rounded} bg-slate-700 overflow-hidden shrink-0 ${RARITY_RING[rarity]}`}>
      <img src={src} alt={name || '?'} className="w-full h-full object-cover scale-110" />
      {rarity === 'legendary' && <div className="absolute inset-0 animate-shimmer pointer-events-none" />}
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="skeleton h-5 w-24 rounded" />
      <div className="card p-6">
        <div className="flex items-center gap-5">
          <div className="skeleton w-20 h-20 rounded-2xl shrink-0" />
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

/* ─── opponent logic ───────────────────────────────────────────────── */
type OppStatus = 'not_played' | 'partial' | 'completed' | 'upcoming';
type OppFilter  = 'all' | 'played' | 'not_played' | 'partial';

interface MatchSummary {
  id: string;
  isHome: boolean;
  playerScore: number;
  opponentScore: number;
  result: 'win' | 'loss' | 'draw' | 'pending';
  date?: string;
}

interface OpponentData {
  opponent: any;
  matchSummaries: MatchSummary[];
  wins: number;
  losses: number;
  draws: number;
  pending: number;
  totalPlayed: number;
  expectedMatches: number;
  status: OppStatus;
}

function getUniqueLeagues(leagueMatches: any[]): any[] {
  const map = new Map<string, any>();
  for (const m of leagueMatches) {
    const lid = m.leagueId || m.league?.id;
    if (lid && !map.has(lid)) map.set(lid, { id: lid, ...(m.league || {}) });
  }
  return [...map.values()];
}

function computeOpponentStats(
  playerId: string,
  leagueMatches: any[],
  leaguePlayers: any[],
  leagueFormat: string,
): OpponentData[] {
  const expected = leagueFormat === 'home_away' ? 2 : 1;

  return leaguePlayers
    .filter((lp: any) => lp.playerId !== playerId)
    .map((lp: any) => {
      const oppId = lp.playerId;
      const between = leagueMatches.filter(
        (m: any) =>
          (m.homePlayerId === playerId && m.awayPlayerId === oppId) ||
          (m.awayPlayerId === playerId && m.homePlayerId === oppId),
      );

      let wins = 0, losses = 0, draws = 0, pending = 0;
      const matchSummaries: MatchSummary[] = between.map((m: any) => {
        const isHome = m.homePlayerId === playerId;
        const ps = isHome ? (m.homeSets ?? 0) : (m.awaySets ?? 0);
        const os = isHome ? (m.awaySets ?? 0) : (m.homeSets ?? 0);
        const isPlayed = m.status === 'completed' || m.status === 'walkover';
        let result: MatchSummary['result'];
        if (!isPlayed)      { result = 'pending'; pending++; }
        else if (ps > os)   { result = 'win';  wins++;   }
        else if (ps < os)   { result = 'loss'; losses++; }
        else                { result = 'draw'; draws++;  }
        return { id: m.id, isHome, playerScore: ps, opponentScore: os, result, date: m.playedAt || m.scheduledDate };
      });

      const totalPlayed = matchSummaries.filter(ms => ms.result !== 'pending').length;

      let status: OppStatus;
      if (between.length === 0)     status = 'not_played';
      else if (totalPlayed === 0)    status = 'upcoming';
      else if (totalPlayed >= expected) status = 'completed';
      else                           status = 'partial';

      return { opponent: lp, matchSummaries, wins, losses, draws, pending, totalPlayed, expectedMatches: expected, status };
    })
    .sort((a, b) => {
      const order: Record<OppStatus, number> = { not_played: 0, partial: 1, upcoming: 2, completed: 3 };
      const d = order[a.status] - order[b.status];
      return d !== 0 ? d : a.totalPlayed - b.totalPlayed;
    });
}

/* ─── result badge ─────────────────────────────────────────────────── */
function ResultBadge({ result }: { result: MatchSummary['result'] }) {
  if (result === 'win')     return <span className="badge badge-win shrink-0">W</span>;
  if (result === 'loss')    return <span className="badge badge-loss shrink-0">L</span>;
  if (result === 'draw')    return <span className="badge badge-draw shrink-0">R</span>;
  return <span className="badge shrink-0 bg-slate-700 text-slate-400">—</span>;
}

/* ─── status badge ─────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: OppStatus }) {
  if (status === 'completed') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
      ✓ Odigrano
    </span>
  );
  if (status === 'partial') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
      ½ Delimično
    </span>
  );
  if (status === 'upcoming') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
      ⏳ Zakazano
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
      — Nije odigrano
    </span>
  );
}

/* ─── main component ────────────────────────────────────────────────── */
export default function PlayerDetailPage() {
  const params = useParams();
  const { club } = useAuthStore();
  const id = params.id as string;

  const [player, setPlayer]   = useState<any>(null);
  const [stats, setStats]     = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', nickname: '', country: '' });
  const [saving, setSaving]   = useState(false);

  // tabs
  const [profileTab, setProfileTab] = useState<'overview' | 'opponents'>('overview');

  // opponents
  const [selectedLeagueId, setSelectedLeagueId]   = useState<string>('');
  const [leaguePlayersCache, setLeaguePlayersCache] = useState<Record<string, any[]>>({});
  const [loadingLeaguePlayers, setLoadingLeaguePlayers] = useState(false);
  const [oppFilter, setOppFilter]   = useState<OppFilter>('all');
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null);
  const [whoNextModal, setWhoNextModal] = useState(false);

  useEffect(() => {
    if (!club?.id) return;
    Promise.all([
      playersApi.getOne(club.id, id),
      playersApi.getStats(club.id, id),
      playersApi.getHistory(club.id, id),
    ]).then(([p, s, h]) => {
      setPlayer(p); setStats(s); setHistory(h);
      const leagues = getUniqueLeagues(h?.leagueMatches || []);
      if (leagues.length > 0) setSelectedLeagueId(leagues[0].id);
    }).finally(() => setLoading(false));
  }, [club?.id, id]);

  useEffect(() => {
    if (!selectedLeagueId || !club?.id) return;
    if (leaguePlayersCache[selectedLeagueId]) return;
    setLoadingLeaguePlayers(true);
    leaguesApi.getPlayers(club.id, selectedLeagueId)
      .then((players: any[]) => setLeaguePlayersCache(prev => ({ ...prev, [selectedLeagueId]: players })))
      .finally(() => setLoadingLeaguePlayers(false));
  }, [selectedLeagueId, club?.id]);

  const startEdit = () => {
    setEditForm({ fullName: player.fullName, nickname: player.nickname || '', country: player.country || '' });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!club?.id) return;
    setSaving(true);
    try {
      const updated = await playersApi.update(club.id, id, editForm);
      setPlayer(updated); setEditing(false);
    } finally { setSaving(false); }
  };

  const avatarSrc = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(player?.fullName || '?')}`;

  const chartData = stats ? [
    { name: 'Pobede', value: stats.wins,   color: '#22c55e' },
    { name: 'Remiji', value: stats.draws,  color: '#94a3b8' },
    { name: 'Porazi', value: stats.losses, color: '#ef4444' },
  ] : [];

  /* ── opponents computed ─────────────────────────────────── */
  const uniqueLeagues  = getUniqueLeagues(history?.leagueMatches || []);
  const selectedLeague = uniqueLeagues.find(l => l.id === selectedLeagueId);
  const leaguePlayers  = leaguePlayersCache[selectedLeagueId] || [];
  const leagueMatchesForSelected = (history?.leagueMatches || []).filter(
    (m: any) => (m.leagueId || m.league?.id) === selectedLeagueId,
  );

  const allOpponents = selectedLeague && leaguePlayers.length > 0
    ? computeOpponentStats(id, leagueMatchesForSelected, leaguePlayers, selectedLeague.format || 'single')
    : [];

  const filteredOpponents = allOpponents.filter(opp => {
    if (oppFilter === 'all')       return true;
    if (oppFilter === 'played')    return opp.status === 'completed' || opp.status === 'partial' || opp.status === 'upcoming';
    if (oppFilter === 'not_played') return opp.status === 'not_played';
    if (oppFilter === 'partial')   return opp.status === 'partial';
    return true;
  });

  const totalOpponents  = allOpponents.length;
  const playedOpponents = allOpponents.filter(o => o.totalPlayed > 0).length;
  const completionPct   = totalOpponents > 0 ? Math.round((playedOpponents / totalOpponents) * 100) : 0;

  const whoNextList = allOpponents.filter(
    o => o.status === 'partial' || o.status === 'not_played',
  ).sort((a, b) => {
    if (a.status === 'partial' && b.status !== 'partial') return -1;
    if (b.status === 'partial' && a.status !== 'partial') return 1;
    return 0;
  });

  /* ── loading / empty ─────────────────────────────────────── */
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

        {/* Back */}
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
              <div className="w-20 h-20 rounded-2xl bg-slate-800 overflow-hidden shrink-0 ring-1 ring-slate-700">
                <img src={avatarSrc} alt={player.fullName} className="w-full h-full object-cover scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{player.fullName}</h2>
                {player.nickname && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>"{player.nickname}"</p>
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
                    onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Nadimak</label>
                    <input className="input-field" value={editForm.nickname} placeholder="Opcionalno"
                      onChange={(e) => setEditForm(f => ({ ...f, nickname: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Zemlja</label>
                    <input className="input-field" value={editForm.country} placeholder="Opcionalno"
                      onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value }))} />
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

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl p-1 w-fit animate-fade-in" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {([
            { id: 'overview',   label: 'Pregled',     icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'opponents',  label: 'Protivnici',  icon: <Swords className="w-3.5 h-3.5" /> },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setProfileTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                profileTab === t.id
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══ PREGLED ══ */}
        {profileTab === 'overview' && (
          <>
            {/* Stats grid */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up stagger-2">
                {[
                  { label: 'Mečevi',   value: stats.matchesPlayed, color: 'text-slate-400',   bg: 'bg-slate-500/10' },
                  { label: 'Pobede',   value: stats.wins,          color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Porazi',   value: stats.losses,        color: 'text-red-400',     bg: 'bg-red-500/10' },
                  { label: '% Pobeda', value: `${stats.winRate}%`, color: 'text-orange-400',  bg: 'bg-orange-500/10' },
                ].map((s, i) => (
                  <div key={s.label} className="card p-4 text-center animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
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
                      contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
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
                    {(history.leagueMatches || []).filter((m: any) => m.status === 'completed' || m.status === 'walkover').slice(0, 10).map((m: any) => {
                      const won  = m.winnerId === id;
                      const draw = !m.winnerId;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors"
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                        >
                          <div className="flex-1 min-w-0">
                            <span style={{ color: 'var(--text-primary)' }}>{m.homePlayer?.fullName}</span>
                            <span className="mx-2 text-xs" style={{ color: 'var(--text-secondary)' }}>vs</span>
                            <span style={{ color: 'var(--text-primary)' }}>{m.awayPlayer?.fullName}</span>
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
          </>
        )}

        {/* ══ PROTIVNICI ══ */}
        {profileTab === 'opponents' && (
          <div className="space-y-4 animate-fade-in-up">

            {uniqueLeagues.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Swords className="w-5 h-5 text-slate-500" />
                </div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nema liga</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Igrač nije u nijednoj ligi</p>
              </div>
            ) : (
              <>
                {/* League selector */}
                {uniqueLeagues.length > 1 && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Liga
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {uniqueLeagues.map(l => (
                        <button
                          key={l.id}
                          onClick={() => { setSelectedLeagueId(l.id); setExpandedOpp(null); }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                            selectedLeagueId === l.id
                              ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                              : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                          }`}
                          style={{ backgroundColor: selectedLeagueId === l.id ? undefined : 'var(--bg-secondary)' }}
                        >
                          {l.name || 'Liga'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary card */}
                {allOpponents.length > 0 && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        Napredak u ligi
                      </h3>
                      <span className="text-xs font-bold text-orange-400">{completionPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${completionPct}%`, background: 'linear-gradient(90deg,#f97316,#ea580c)' }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {playedOpponents} / {totalOpponents} protivnika odigrano
                    </p>
                    <div className="flex flex-wrap gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                      {[
                        { label: 'Odigrano',    value: allOpponents.filter(o => o.status === 'completed').length, color: 'text-emerald-400' },
                        { label: 'Delimično',   value: allOpponents.filter(o => o.status === 'partial').length,   color: 'text-amber-400' },
                        { label: 'Nije',        value: allOpponents.filter(o => o.status === 'not_played').length, color: 'text-slate-400' },
                        { label: 'Zakazano',    value: allOpponents.filter(o => o.status === 'upcoming').length,  color: 'text-blue-400' },
                      ].map(s => (
                        <div key={s.label} className="flex items-baseline gap-1.5">
                          <span className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Who's next CTA */}
                {whoNextList.length > 0 && (
                  <button
                    onClick={() => setWhoNextModal(true)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: 'linear-gradient(135deg,rgba(249,115,22,0.1),rgba(234,88,12,0.07))',
                      border: '1px solid rgba(249,115,22,0.25)',
                      color: '#f97316',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      <span>Ko sledeći na red?</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'all',       label: 'Svi' },
                    { id: 'played',    label: 'Odigrano' },
                    { id: 'partial',   label: 'Delimično' },
                    { id: 'not_played', label: 'Nije' },
                  ] as const).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setOppFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                        oppFilter === f.id
                          ? 'bg-slate-700 text-white border-slate-600'
                          : 'text-slate-400 border-slate-700 hover:text-slate-300'
                      }`}
                      style={{ backgroundColor: oppFilter === f.id ? undefined : 'var(--bg-secondary)' }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Loading */}
                {loadingLeaguePlayers && (
                  <div className="card p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-400" />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>
                  </div>
                )}

                {/* Opponent list */}
                {!loadingLeaguePlayers && (
                  <div className="space-y-2">
                    {filteredOpponents.length === 0 ? (
                      <div className="card p-8 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nema protivnika za ovaj filter</p>
                      </div>
                    ) : (
                      filteredOpponents.map(opp => {
                        const oppName = opp.opponent.player?.fullName || opp.opponent.playerId;
                        const isExpanded = expandedOpp === opp.opponent.playerId;
                        return (
                          <div
                            key={opp.opponent.playerId}
                            className="card overflow-hidden"
                          >
                            {/* Card header */}
                            <button
                              className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-slate-700/20"
                              onClick={() => setExpandedOpp(isExpanded ? null : opp.opponent.playerId)}
                            >
                              <Avatar name={oppName} size="md" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                    {oppName}
                                  </span>
                                  <StatusBadge status={opp.status} />
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                  {opp.status === 'not_played' && 'Nije odigrano'}
                                  {opp.status === 'upcoming'   && `Zakazano (${opp.matchSummaries.length} meč)`}
                                  {(opp.status === 'partial' || opp.status === 'completed') && (
                                    `${opp.totalPlayed}/${opp.expectedMatches} · P:${opp.wins} I:${opp.losses} R:${opp.draws}`
                                  )}
                                  {opp.status === 'partial' && opp.expectedMatches === 2 && (
                                    ` · nedostaje ${opp.matchSummaries.filter(ms => ms.isHome).length === 0 ? 'domaćin' : 'gost'}`
                                  )}
                                </p>
                              </div>
                              {opp.matchSummaries.length > 0 && (
                                isExpanded
                                  ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                                  : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                            </button>

                            {/* Expanded match list */}
                            {isExpanded && opp.matchSummaries.length > 0 && (
                              <div style={{ borderTop: '1px solid var(--border)' }}>
                                {opp.matchSummaries.map((ms, idx) => (
                                  <div
                                    key={ms.id || idx}
                                    className="flex items-center gap-3 px-4 py-3 text-sm"
                                    style={{ borderBottom: idx < opp.matchSummaries.length - 1 ? '1px solid var(--border)' : undefined, backgroundColor: 'var(--bg-secondary)' }}
                                  >
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                                      style={{
                                        backgroundColor: ms.isHome ? 'rgba(249,115,22,0.15)' : 'rgba(99,102,241,0.15)',
                                        color: ms.isHome ? '#f97316' : '#818cf8',
                                      }}
                                    >
                                      {ms.isHome ? '🏠' : '🚗'}
                                    </span>
                                    {ms.result !== 'pending' ? (
                                      <span className="font-mono font-semibold tabular-nums text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                                        {ms.playerScore} : {ms.opponentScore}
                                      </span>
                                    ) : (
                                      <span className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {ms.date
                                          ? new Date(ms.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' })
                                          : 'Na čekanju'}
                                      </span>
                                    )}
                                    <ResultBadge result={ms.result} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Who's Next Modal ─────────────────────────────────────── */}
      {whoNextModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={() => setWhoNextModal(false)}
        >
          <div
            className="card w-full sm:max-w-sm p-5 animate-scale-in rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Ko sledeći na red?</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Protivnici koji čekaju meč
                </p>
              </div>
              <button onClick={() => setWhoNextModal(false)} className="p-1.5 rounded-xl hover:bg-slate-700 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {whoNextList.slice(0, 10).map(opp => {
                const oppName = opp.opponent.player?.fullName || opp.opponent.playerId;
                return (
                  <div key={opp.opponent.playerId} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <Avatar name={oppName} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{oppName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {opp.status === 'partial' ? `${opp.totalPlayed}/${opp.expectedMatches} odigrano` : 'Nije odigrano'}
                      </p>
                    </div>
                    <StatusBadge status={opp.status} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
