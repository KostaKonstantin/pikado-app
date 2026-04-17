'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { RefreshCw, Trophy, Calendar, CheckCircle2, Clock, ChevronDown } from 'lucide-react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3099').replace(/\/$/, '');

type StandingRow = {
  position: number;
  player: { id: string; fullName: string } | null;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  setsFor: number;
  setsAgainst: number;
  points: number;
};

type MatchRow = {
  id: string;
  homePlayer: { id: string; fullName: string } | null;
  awayPlayer: { id: string; fullName: string } | null;
  homeSets: number;
  awaySets: number;
  status: string;
  winnerId: string | null;
  isPostponed: boolean;
  scheduledDate: string | null;
};

type Group = {
  label: number;
  sessionStatus?: string;
  matches: MatchRow[];
};

type ShareData = {
  league: { id: string; name: string; format: string; status: string; mode: string };
  standings: StandingRow[];
  groups: Group[];
  isEuroleague: boolean;
};

function RankBadge({ pos }: { pos: number }) {
  const cls =
    pos === 1 ? 'bg-yellow-400 text-black shadow-yellow-400/30 shadow-md' :
    pos === 2 ? 'bg-slate-300 text-slate-900 shadow-slate-300/20 shadow-md' :
    pos === 3 ? 'bg-amber-600 text-white shadow-amber-600/25 shadow-md' :
                'bg-slate-700/80 text-slate-400';
  return (
    <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold shrink-0 ${cls}`}>
      {pos}
    </span>
  );
}

type ActiveTab = 'tabela' | 'mecevi';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tabela');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const toggleGroup = (label: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/share/${token}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('invalid');
      const d: ShareData = await res.json();
      setData(d);
      setLastUpdated(new Date());
      setError('');
      // Auto-open only the last group
      if (d.groups.length > 0) {
        setExpandedGroups(new Set([d.groups[d.groups.length - 1].label]));
      }
    } catch {
      setError('Link nije validan ili liga više ne postoji.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!loading && error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6">
        <Trophy className="w-12 h-12 text-slate-600 mb-4" />
        <p className="text-slate-300 font-semibold mb-1">Link nije validan</p>
        <p className="text-slate-500 text-sm text-center">{error}</p>
      </div>
    );
  }

  const groupLabel = (g: Group) =>
    data?.isEuroleague ? `Ligaški Dan ${g.label}` : `Kolo ${g.label}`;

  return (
    <div
      className="min-h-screen bg-[#0f172a] text-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="bg-orange-500 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: '16px' }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src="/logo.svg" alt="Pikado" className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-orange-100 font-medium tracking-wide">Pikado App · Liga</p>
            <h1 className="text-base font-bold text-white truncate leading-tight mt-0.5">
              {loading && !data ? '...' : (data?.league?.name ?? 'Nepoznata liga')}
            </h1>
          </div>
          {/* Refresh — 44×44 touch target */}
          <button
            onClick={load}
            disabled={loading}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 active:bg-white/25 transition-colors disabled:opacity-50"
            title="Osveži"
          >
            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Sticky tabs ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
        <div className="max-w-lg mx-auto flex">
          {(['tabela', 'mecevi'] as ActiveTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                activeTab === t
                  ? 'text-orange-400 border-b-2 border-orange-400'
                  : 'text-slate-400'
              }`}
            >
              {t === 'tabela' ? 'Tabela' : 'Mečevi'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-3 py-4">

        {/* ── Skeleton ────────────────────────────────────────────────────── */}
        {loading && !data && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Standings tab ───────────────────────────────────────────────── */}
        {!loading && data && activeTab === 'tabela' && (
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-orange-500">

            {/* Column headers */}
            <div className="flex items-center bg-slate-800/90 px-3 sm:px-4 h-9 border-b border-slate-700/60">
              <div className="w-9 shrink-0" />
              <div className="flex-1 min-w-0 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Igrač
              </div>
              <div className="flex shrink-0">
                <span className="w-7 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">M</span>
                <span className="w-7 text-center text-[10px] font-semibold text-green-500/80 uppercase tracking-wider">P</span>
                <span className="w-7 text-center text-[10px] font-semibold text-yellow-500/80 uppercase tracking-wider">R</span>
                <span className="w-7 text-center text-[10px] font-semibold text-red-500/80 uppercase tracking-wider">G</span>
                <span className="w-10 text-right text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Bod</span>
              </div>
            </div>

            {data.standings.length === 0 && (
              <div className="bg-slate-800 py-12">
                <p className="text-center text-slate-500 text-sm">Još nema odigranih mečeva</p>
              </div>
            )}

            {data.standings.map((s, idx) => {
              const accentColor =
                s.position === 1 ? 'bg-yellow-400' :
                s.position === 2 ? 'bg-slate-300' :
                s.position === 3 ? 'bg-amber-600' : '';

              return (
                <div
                  key={s.player?.id ?? idx}
                  className={`relative flex items-center px-3 sm:px-4 py-3.5 border-b border-slate-700/25 last:border-0 ${
                    idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/60'
                  }`}
                >
                  {/* Top-3 accent line */}
                  {s.position <= 3 && (
                    <div className={`absolute left-0 top-0 bottom-0 w-0.75 rounded-r-full ${accentColor}`} />
                  )}

                  {/* Rank badge */}
                  <div className="w-9 shrink-0 flex justify-center">
                    <RankBadge pos={s.position} />
                  </div>

                  {/* Player name + sets ratio */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-snug">
                      {s.player?.fullName ?? '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 tabular-nums mt-0.5 leading-none">
                      {s.setsFor}:{s.setsAgainst}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex shrink-0">
                    <span className="w-7 text-center text-sm text-slate-400 tabular-nums">{s.played}</span>
                    <span className="w-7 text-center text-sm text-green-400 tabular-nums font-semibold">{s.won}</span>
                    <span className="w-7 text-center text-sm text-yellow-400 tabular-nums font-semibold">{s.drawn}</span>
                    <span className="w-7 text-center text-sm text-red-400 tabular-nums font-semibold">{s.lost}</span>
                    <span className="w-10 text-right text-sm font-bold text-orange-400 tabular-nums">{s.points}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Matches tab ─────────────────────────────────────────────────── */}
        {!loading && data && activeTab === 'mecevi' && (
          <div className="space-y-3">
            {data.groups.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-10">
                {data.isEuroleague ? 'Nema odigranih ligaških dana' : 'Nema generisanih mečeva'}
              </p>
            )}

            {data.groups.map((group) => {
              const isOpen = group.sessionStatus === 'open';
              const isExpanded = expandedGroups.has(group.label);
              const doneCount = group.matches.filter((m) => m.status === 'completed').length;

              return (
                <div key={group.label} className="bg-slate-800 rounded-2xl overflow-hidden shadow-xl">

                  {/* Group header — tappable */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 active:bg-slate-700/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-200 truncate">
                        {groupLabel(group)}
                      </span>
                      {data.isEuroleague && isOpen && (
                        <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full shrink-0">
                          U toku
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500 tabular-nums">
                        {doneCount}/{group.matches.length}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Collapsible matches */}
                  {isExpanded && (
                    <div className="border-t border-slate-700">
                  {group.matches.map((m) => {
                    const isDone = m.status === 'completed';
                    const homeWon = isDone && m.winnerId === m.homePlayer?.id;
                    const awayWon = isDone && m.winnerId === m.awayPlayer?.id;

                    return (
                      <div key={m.id} className="px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-slate-700/40 last:border-0">
                        <div className="flex items-center gap-2">

                          {/* Home player */}
                          <p className={`flex-1 text-sm text-right leading-tight truncate ${
                            homeWon ? 'font-bold text-white' : 'text-slate-300'
                          }`}>
                            {m.homePlayer?.fullName ?? '—'}
                          </p>

                          {/* Score / status — fixed width so names get equal space */}
                          <div className="shrink-0 w-14 sm:w-16 text-center">
                            {isDone ? (
                              <span className="text-sm font-bold text-orange-400 tabular-nums">
                                {m.homeSets} : {m.awaySets}
                              </span>
                            ) : m.isPostponed ? (
                              <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                Odložen
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-500">vs</span>
                            )}
                          </div>

                          {/* Away player */}
                          <p className={`flex-1 text-sm leading-tight truncate ${
                            awayWon ? 'font-bold text-white' : 'text-slate-300'
                          }`}>
                            {m.awayPlayer?.fullName ?? '—'}
                          </p>

                          {/* Status icon */}
                          <div className="shrink-0 w-4 flex justify-center">
                            {isDone
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              : <Clock className="w-3.5 h-3.5 text-slate-700" />
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {lastUpdated && (
          <p className="text-center text-[11px] text-slate-600 mt-5 pb-2">
            Osveženo u {lastUpdated.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
