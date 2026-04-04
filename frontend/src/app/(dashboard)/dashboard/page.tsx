'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import {
  Plus, ArrowRight, Swords, Users, Trophy,
  Zap, CheckCircle2, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { DartAvatar } from '@/components/ui/dart-avatar';

/* ─── rank medal ────────────────────────────────────────────────── */
function Medal({ pos }: { pos: number }) {
  const style =
    pos === 1 ? 'bg-yellow-400/15 text-yellow-400 ring-1 ring-yellow-400/30' :
    pos === 2 ? 'bg-slate-400/15 text-slate-300 ring-1 ring-slate-400/20' :
                'bg-amber-700/15 text-amber-500 ring-1 ring-amber-600/20';
  return (
    <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0 ${style}`}>
      {pos}
    </span>
  );
}

/* ─── skeleton blocks ───────────────────────────────────────────── */
function SkeletonHero() {
  return (
    <div className="card p-5 space-y-3 animate-pulse">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-7 w-44 rounded" />
      <div className="skeleton h-2 w-full rounded-full" />
      <div className="skeleton h-9 w-32 rounded-xl" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { club, user } = useAuthStore();

  const [leagues,    setLeagues]    = useState<any[]>([]);
  const [players,    setPlayers]    = useState<any[]>([]);
  const [activeLeague, setActiveLeague] = useState<any>(null);
  const [leagueStats,  setLeagueStats]  = useState<any>(null);
  const [fixtures,     setFixtures]     = useState<any[]>([]);
  const [standings,    setStandings]    = useState<any[]>([]);
  const [sessions,     setSessions]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [leagueLoading, setLeagueLoading] = useState(false);

  /* ── load ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!club?.id) return;
    setLoading(true);
    Promise.all([
      leaguesApi.getAll(club.id),
      playersApi.getAll(club.id),
    ]).then(([ls, ps]) => {
      setLeagues(ls);
      setPlayers(ps);
      /* pick first active league, or latest */
      const active = ls.find((l: any) => l.status === 'active') ?? ls[0] ?? null;
      setActiveLeague(active);
      if (active) loadLeagueData(active.id, club.id);
      else setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id]);

  const loadLeagueData = async (leagueId: string, clubId: string) => {
    setLeagueLoading(true);
    try {
      const [st, fx, sd, se] = await Promise.all([
        leaguesApi.getStats(clubId, leagueId),
        leaguesApi.getFixtures(clubId, leagueId),
        leaguesApi.getStandings(clubId, leagueId),
        leaguesApi.getSessions(clubId, leagueId).catch(() => []),
      ]);
      setLeagueStats(st);
      setFixtures(fx);
      setStandings(sd);
      setSessions(se);
    } finally {
      setLeagueLoading(false);
      setLoading(false);
    }
  };

  /* ── derived ─────────────────────────────────────────────────── */
  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return 'Dobro jutro';
    if (h >= 12 && h < 18) return 'Dobar dan';
    return 'Dobro veče';
  })();

  /* last 6 completed fixtures, newest first */
  const recentMatches = [...fixtures]
    .filter((m: any) => m.status === 'completed')
    .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
    .slice(0, 6);

  /* active (open) session */
  const activeSession = sessions.find((s: any) => s.status === 'open');

  /* top 3 standings */
  const top3 = standings.slice(0, 3);

  const progressPct  = leagueStats?.progressPct  ?? 0;
  const totalMatches = leagueStats?.expectedTotalMatches ?? 0;
  const doneMatches  = leagueStats?.completedMatches ?? 0;

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar title="Pregled" />

      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

        {/* ── greeting ─────────────────────────────────────────── */}
        <div className="animate-fade-in">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {greeting}{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 👋
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {club?.name}
          </p>
        </div>

        {/* ── HERO: league progress ─────────────────────────────── */}
        {loading ? <SkeletonHero /> : activeLeague ? (
          <div className="card p-5 animate-fade-in-up relative overflow-hidden">
            {/* subtle glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400/80 mb-1">
                    Aktivna liga
                  </p>
                  <h3 className="text-xl font-bold text-white leading-tight">{activeLeague.name}</h3>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 mt-0.5
                  ${activeLeague.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-slate-700 text-slate-400'}
                `}>
                  {activeLeague.status === 'active' ? 'Aktivan' : activeLeague.status}
                </span>
              </div>

              {/* progress bar */}
              {leagueStats?.isGenerated ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold text-white">{doneMatches}</span> / {totalMatches} mečeva
                    </span>
                    <span className="font-bold text-orange-400">{progressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mb-4">Raspored još nije generisan</p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/leagues/${activeLeague.id}`}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-all active:scale-95 shadow-md shadow-orange-500/25"
                >
                  Nastavi ligu <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {leagues.length > 1 && (
                  <Link href="/leagues" className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1">
                    Sve lige ({leagues.length})
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* no league yet */
          <div className="card p-5 text-center animate-fade-in-up">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
              <Swords className="w-5 h-5 text-orange-400" />
            </div>
            <p className="font-semibold text-white mb-1">Nema aktivne lige</p>
            <p className="text-xs text-slate-500 mb-4">Kreiraj prvu ligu da bi počeo</p>
            <Link href="/leagues/new" className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Kreiraj ligu
            </Link>
          </div>
        )}

        {/* ── CURRENT SESSION ──────────────────────────────────── */}
        {!loading && activeLeague && (
          leagueLoading ? (
            <div className="card p-4 animate-pulse space-y-2">
              <div className="skeleton h-3 w-28 rounded" />
              <div className="skeleton h-2 w-full rounded-full" />
            </div>
          ) : activeSession ? (
            <div className="card p-4 animate-fade-in-up stagger-2">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Ligaški Dan {activeSession.sessionNumber}
                    </p>
                    {activeSession.sessionDate && (
                      <p className="text-[10px] text-slate-500">
                        {new Date(activeSession.sessionDate).toLocaleDateString('sr-RS')}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-green-500/15 text-green-400 px-2 py-0.5 rounded-lg">
                  Aktivan
                </span>
              </div>

              {/* session progress */}
              {activeSession.matchCount > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold text-white">{activeSession.completedCount ?? 0}</span>
                      {' '}/ {activeSession.matchCount} mečeva
                    </span>
                    <span className="text-slate-500">
                      {(activeSession.matchCount ?? 0) - (activeSession.completedCount ?? 0)} preostalo
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                      style={{ width: `${Math.round(((activeSession.completedCount ?? 0) / activeSession.matchCount) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <Link
                href={`/leagues/${activeLeague.id}?tab=raspored`}
                className="text-xs font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
              >
                Idi na raspored <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : leagueStats?.isGenerated ? (
            <div className="card p-4 flex items-center gap-3 animate-fade-in-up stagger-2">
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Nema aktivnog dana</p>
                <p className="text-xs text-slate-500">Pokrenite novi ligaški dan</p>
              </div>
              <Link
                href={`/leagues/${activeLeague.id}?tab=raspored`}
                className="text-xs font-semibold text-orange-400 hover:text-orange-300 shrink-0 transition-colors"
              >
                Pokrenuti →
              </Link>
            </div>
          ) : null
        )}

        {/* ── QUICK ACTIONS ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5 animate-fade-in-up stagger-3">
          {[
            { href: '/players/new', label: 'Dodaj igrača',  icon: Users,   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { href: '/leagues',     label: 'Sve lige',      icon: Swords,  color: 'text-blue-400',    bg: 'bg-blue-500/10' },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="card p-3.5 flex items-center gap-3 group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/15 active:scale-95"
            >
              <div className={`w-8 h-8 rounded-xl ${a.bg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                <a.icon className={`w-4 h-4 ${a.color}`} />
              </div>
              <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {a.label}
              </span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>

        {/* ── LIVE ACTIVITY ────────────────────────────────────── */}
        {!loading && recentMatches.length > 0 && (
          <div className="card overflow-hidden animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-white">Poslednji rezultati</p>
              </div>
              <Link
                href={`/leagues/${activeLeague?.id}`}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Svi →
              </Link>
            </div>

            <div className="divide-y divide-slate-800/60">
              {recentMatches.map((m: any) => {
                const homeWon = (m.homeSets ?? 0) > (m.awaySets ?? 0);
                const awayWon = (m.awaySets ?? 0) > (m.homeSets ?? 0);
                const isDraw  = m.homeSets === m.awaySets;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/40 transition-colors">
                    {/* home */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className={`text-sm font-medium truncate ${homeWon ? 'text-white' : 'text-slate-500'}`}>
                        {m.homePlayer?.fullName}
                      </span>
                      <DartAvatar name={m.homePlayer?.fullName} size="sm" />
                    </div>

                    {/* score */}
                    <div className={`flex items-center gap-1 shrink-0 text-sm font-bold tabular-nums px-2 py-0.5 rounded-lg
                      ${isDraw ? 'text-slate-400 bg-slate-800' :
                        homeWon ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}
                    `}>
                      <span className={homeWon ? 'text-green-400' : isDraw ? 'text-slate-400' : 'text-slate-500'}>{m.homeSets}</span>
                      <span className="text-slate-600 text-xs">:</span>
                      <span className={awayWon ? 'text-green-400' : isDraw ? 'text-slate-400' : 'text-slate-500'}>{m.awaySets}</span>
                    </div>

                    {/* away */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <DartAvatar name={m.awayPlayer?.fullName} size="sm" />
                      <span className={`text-sm font-medium truncate ${awayWon ? 'text-white' : 'text-slate-500'}`}>
                        {m.awayPlayer?.fullName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MINI LEADERBOARD ─────────────────────────────────── */}
        {!loading && top3.length > 0 && (
          <div className="card overflow-hidden animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-white">Top 3</p>
              </div>
              <Link
                href={`/leagues/${activeLeague?.id}`}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Tabela →
              </Link>
            </div>

            <div className="divide-y divide-slate-800/60">
              {top3.map((s: any, i: number) => (
                <div key={s.player?.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/40 transition-colors"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Medal pos={i + 1} />
                  <DartAvatar name={s.player?.fullName} size="md" rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.player?.fullName}</p>
                    <p className="text-xs text-slate-500">{s.played} meč. · {s.won}P {s.drawn}R {s.lost}G</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-orange-400">{s.points}</p>
                    <p className="text-[10px] text-slate-600">bod.</p>
                  </div>
                </div>
              ))}
            </div>

            {standings.length > 3 && (
              <div className="px-4 py-2.5 border-t border-slate-800/60">
                <Link
                  href={`/leagues/${activeLeague?.id}`}
                  className="text-xs text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1"
                >
                  +{standings.length - 3} igrača više <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── club summary footer ───────────────────────────────── */}
        {!loading && (
          <div className="flex items-center gap-4 px-1 pb-2 animate-fade-in stagger-5">
            <Link href="/leagues" className="flex items-center gap-1.5 text-xs transition-colors hover:text-orange-400" style={{ color: 'var(--text-secondary)' }}>
              <Swords className="w-3.5 h-3.5" />
              {leagues.length} lig{leagues.length !== 1 ? 'e' : 'a'}
            </Link>
            <Link href="/players" className="flex items-center gap-1.5 text-xs transition-colors hover:text-orange-400" style={{ color: 'var(--text-secondary)' }}>
              <Users className="w-3.5 h-3.5" />
              {players.length} igrač{players.length !== 1 ? 'a' : ''}
            </Link>
            {doneMatches > 0 && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                {doneMatches} mečeva odigrano
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
