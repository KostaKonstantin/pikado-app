'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { RefreshCw, Trophy, Calendar, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3099').replace(/\/$/, '');

/* ── Types ──────────────────────────────────────────────────────────── */
type Player = { id: string; fullName: string };

type StandingRow = {
  position: number;
  player: Player | null;
  played: number; won: number; lost: number; drawn: number;
  setsFor: number; setsAgainst: number; points: number;
};

type MatchRow = {
  id: string;
  homePlayer: Player | null;
  awayPlayer: Player | null;
  homeSets: number; awaySets: number;
  status: string; winnerId: string | null;
  isPostponed: boolean; scheduledDate: string | null;
};

type Group = { label: number; sessionStatus?: string; matches: MatchRow[] };

type PhaseData = {
  id: string; name: string;
  type: 'round_robin' | 'knockout';
  status: 'active' | 'completed';
  phaseOrder: number;
  standings: StandingRow[];
  groups: Group[];
};

type ShareData = {
  league: { id: string; name: string; format: string; status: string; mode: string };
  standings: StandingRow[];
  groups: Group[];
  isEuroleague: boolean;
  phases: PhaseData[];
};

type ActiveTab = 'tabela' | 'mecevi' | 'dvoboji';

/* ── Sub-components ─────────────────────────────────────────────────── */
function RankBadge({ pos }: { pos: number }) {
  const cls =
    pos === 1 ? 'bg-yellow-400 text-black' :
    pos === 2 ? 'bg-slate-300 text-slate-900' :
    pos === 3 ? 'bg-amber-600 text-white' :
                'bg-slate-700/80 text-slate-400';
  const glowAnim =
    pos === 1 ? 'goldGlow 2.2s ease-in-out infinite' :
    pos === 2 ? 'silverGlow 2.5s ease-in-out infinite' :
    pos === 3 ? 'bronzeGlow 2.8s ease-in-out infinite' : undefined;
  return (
    <span
      className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold shrink-0 ${cls}`}
      style={glowAnim ? { animation: glowAnim } : undefined}
    >
      {pos}
    </span>
  );
}

function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const duration = 750;
      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return <>{display}</>;
}

function StandingsTable({ standings }: { standings: StandingRow[] }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-orange-500">
      <div className="flex items-center bg-slate-800/90 px-3 sm:px-4 h-9 border-b border-slate-700/60">
        <div className="w-9 shrink-0" />
        <div className="flex-1 min-w-0 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Igrač</div>
        <div className="flex shrink-0">
          <span className="w-7 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">M</span>
          <span className="w-7 text-center text-[10px] font-semibold text-green-500/80 uppercase tracking-wider">P</span>
          <span className="w-7 text-center text-[10px] font-semibold text-yellow-500/80 uppercase tracking-wider">R</span>
          <span className="w-7 text-center text-[10px] font-semibold text-red-500/80 uppercase tracking-wider">G</span>
          <span className="w-10 text-right text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Bod</span>
        </div>
      </div>
      {standings.length === 0 && (
        <div className="bg-slate-800 py-12">
          <p className="text-center text-slate-500 text-sm">Još nema odigranih mečeva</p>
        </div>
      )}
      {standings.map((s, idx) => {
        const accentColor =
          s.position === 1 ? 'bg-yellow-400' :
          s.position === 2 ? 'bg-slate-300' :
          s.position === 3 ? 'bg-amber-600' : '';
        const rowDelay = idx * 0.05;
        return (
          <motion.div
            key={s.player?.id ?? idx}
            className={`relative flex items-center px-3 sm:px-4 py-3.5 border-b border-slate-700/25 last:border-0 ${
              idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/60'
            }`}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: rowDelay, ease: 'easeOut' }}
          >
            {s.position <= 3 && (
              <div className={`absolute left-0 top-0 bottom-0 w-0.75 rounded-r-full ${accentColor}`} />
            )}
            <div className="w-9 shrink-0 flex justify-center">
              <RankBadge pos={s.position} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-snug">{s.player?.fullName ?? '—'}</p>
              <p className="text-[10px] text-slate-500 tabular-nums mt-0.5 leading-none">{s.setsFor}:{s.setsAgainst}</p>
            </div>
            <div className="flex shrink-0">
              <span className="w-7 text-center text-sm text-slate-400 tabular-nums">{s.played}</span>
              <span className="w-7 text-center text-sm text-green-400 tabular-nums font-semibold">{s.won}</span>
              <span className="w-7 text-center text-sm text-yellow-400 tabular-nums font-semibold">{s.drawn}</span>
              <span className="w-7 text-center text-sm text-red-400 tabular-nums font-semibold">{s.lost}</span>
              <span className="w-10 text-right text-sm font-bold text-orange-400 tabular-nums">
                <CountUp value={s.points} delay={rowDelay * 1000 + 200} />
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function MatchGroups({
  groups, expandedGroups, toggleGroup, groupLabel,
}: {
  groups: Group[];
  expandedGroups: Set<number>;
  toggleGroup: (n: number) => void;
  groupLabel: (g: Group) => string;
}) {
  return (
    <div className="space-y-3">
      {groups.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-10">Nema mečeva</p>
      )}
      {groups.map((group) => {
        const isOpen = group.sessionStatus === 'open';
        const isExpanded = expandedGroups.has(group.label);
        const doneCount = group.matches.filter(m => m.status === 'completed').length;
        return (
          <div key={group.label} className="bg-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <button
              onClick={() => toggleGroup(group.label)}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 active:bg-slate-700/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-200 truncate">{groupLabel(group)}</span>
                {isOpen && (
                  <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full shrink-0">U toku</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 tabular-nums">{doneCount}/{group.matches.length}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-slate-700">
                {group.matches.map(m => {
                  const isDone = m.status === 'completed';
                  const homeWon = isDone && m.winnerId === m.homePlayer?.id;
                  const awayWon = isDone && m.winnerId === m.awayPlayer?.id;
                  return (
                    <div key={m.id} className="px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-slate-700/40 last:border-0">
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 text-sm text-right leading-tight truncate ${homeWon ? 'font-bold text-white' : 'text-slate-300'}`}>
                          {m.homePlayer?.fullName ?? '—'}
                        </p>
                        <div className="shrink-0 w-14 sm:w-16 text-center">
                          {isDone ? (
                            <span className="text-sm font-bold text-orange-400 tabular-nums">{m.homeSets} : {m.awaySets}</span>
                          ) : m.isPostponed ? (
                            <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">Odložen</span>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500">vs</span>
                          )}
                        </div>
                        <p className={`flex-1 text-sm leading-tight truncate ${awayWon ? 'font-bold text-white' : 'text-slate-300'}`}>
                          {m.awayPlayer?.fullName ?? '—'}
                        </p>
                        <div className="shrink-0 w-4 flex justify-center">
                          {isDone
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            : <Clock className="w-3.5 h-3.5 text-slate-700" />}
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
  );
}

function DvobojiTab({
  players, opponents, selectedPlayerId, expectedPerPair,
  onPlayerChange, expandedPairs, togglePair, selectedPlayer,
}: {
  players: Player[];
  opponents: { opponent: Player; between: MatchRow[]; completed: MatchRow[]; status: string }[];
  selectedPlayerId: string;
  expectedPerPair: number;
  onPlayerChange: (id: string) => void;
  expandedPairs: Set<string>;
  togglePair: (id: string) => void;
  selectedPlayer: Player | undefined;
}) {
  const pairStats = {
    completed:  opponents.filter(o => o.status === 'completed').length,
    partial:    opponents.filter(o => o.status === 'partial').length,
    upcoming:   opponents.filter(o => o.status === 'upcoming').length,
    not_played: opponents.filter(o => o.status === 'not_played').length,
  };

  if (players.length < 2) return <p className="text-center text-slate-500 text-sm py-10">Nema dovoljno igrača.</p>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <select
          value={selectedPlayerId}
          onChange={e => onPlayerChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 pr-8 appearance-none focus:outline-none focus:border-orange-500"
        >
          {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
      </div>

      <div className="flex gap-4 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700/50">
        {[
          { label: 'Završeno',  value: pairStats.completed,  color: 'text-emerald-400' },
          { label: 'Delimično', value: pairStats.partial,    color: 'text-amber-400'   },
          { label: 'Zakazano',  value: pairStats.upcoming,   color: 'text-indigo-400'  },
          { label: 'Nije',      value: pairStats.not_played, color: 'text-slate-500'   },
        ].map(s => (
          <div key={s.label} className="flex items-baseline gap-1">
            <span className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</span>
            <span className="text-[10px] text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {opponents.map(({ opponent, between, completed, status }) => {
          const isExpanded = expandedPairs.has(opponent.id);
          const canExpand = between.length > 0;

          let statusEl: React.ReactElement;
          if (status === 'completed')
            statusEl = <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-emerald-400/15 text-emerald-400">✓ Završeno</span>;
          else if (status === 'partial')
            statusEl = <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-amber-400/15 text-amber-400">{completed.length}/{expectedPerPair}</span>;
          else if (status === 'upcoming')
            statusEl = <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-indigo-400/15 text-indigo-400">⏳ Zakazano</span>;
          else
            statusEl = <span className="text-[10px] text-slate-500 shrink-0">Nije</span>;

          return (
            <div key={opponent.id} className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50">
              <button
                onClick={() => canExpand && togglePair(opponent.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${canExpand ? 'active:bg-slate-700/40' : 'cursor-default'}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-300">
                    {opponent.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 text-sm font-medium text-slate-200 truncate">{opponent.fullName}</span>
                {statusEl}
                {canExpand && (isExpanded
                  ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />)}
              </button>
              {isExpanded && between.length > 0 && (
                <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                  {between.map(m => {
                    const isDone = m.status === 'completed';
                    const homeIsSelected = m.homePlayer?.id === selectedPlayer?.id;
                    const homeN = homeIsSelected ? selectedPlayer!.fullName : opponent.fullName;
                    const awayN = homeIsSelected ? opponent.fullName : selectedPlayer!.fullName;
                    const homeWon = isDone && m.homeSets > m.awaySets;
                    const awayWon = isDone && m.awaySets > m.homeSets;
                    return (
                      <div key={m.id} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-orange-500/15 text-orange-400">DOM</span>
                          <span className={`flex-1 text-xs truncate ${homeWon ? 'font-bold text-white' : 'text-slate-400'}`}>{homeN}</span>
                          <span className="shrink-0 text-sm font-bold tabular-nums text-slate-200 min-w-11 text-center">
                            {isDone ? `${m.homeSets} : ${m.awaySets}` : <span className="text-slate-600 text-xs">vs</span>}
                          </span>
                          <span className={`flex-1 text-xs truncate text-right ${awayWon ? 'font-bold text-white' : 'text-slate-400'}`}>{awayN}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-indigo-500/15 text-indigo-400">GOS</span>
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
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────── */
export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tabela');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [dvobojiPlayerId, setDvobojiPlayerId] = useState<string>('');
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [activePhaseKey, setActivePhaseKey] = useState<string>('regular');
  const [refreshSpinKey, setRefreshSpinKey] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const PULL_THRESHOLD = 70;

  const toggleGroup = (label: number) => setExpandedGroups(prev => {
    const next = new Set(prev); next.has(label) ? next.delete(label) : next.add(label); return next;
  });
  const togglePair = (id: string) => setExpandedPairs(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/share/${token}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('invalid');
      const d: ShareData = await res.json();
      d.phases = d.phases ?? [];
      d.standings = d.standings ?? [];
      d.groups = d.groups ?? [];
      setData(d);
      setLastUpdated(new Date());
      setError('');
      if (d.groups.length > 0) setExpandedGroups(new Set([d.groups[d.groups.length - 1].label]));
      if (d.standings.length > 0 && d.standings[0].player) setDvobojiPlayerId(d.standings[0].player.id);
      if (d.groups.length === 0 && d.phases.length > 0) setActivePhaseKey(d.phases[0].id);
    } catch {
      setError('Link nije validan ili liga više ne postoji.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Share page je uvek dark — forsiramo dark klasu bez obzira na system/user preference
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && !loading) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [loading]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullDistance(Math.min(delta * 0.45, PULL_THRESHOLD));
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD * 0.85) {
      setRefreshSpinKey(k => k + 1);
      load();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, load]);

  if (!loading && error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6">
        <Trophy className="w-12 h-12 text-slate-600 mb-4" />
        <p className="text-slate-300 font-semibold mb-1">Link nije validan</p>
        <p className="text-slate-500 text-sm text-center">{error}</p>
      </div>
    );
  }

  const groupLabel = (g: Group) => data?.isEuroleague ? `Ligaški Dan ${g.label}` : `Kolo ${g.label}`;

  /* Dvoboji data for regular season */
  const allMatches = data ? data.groups.flatMap(g => g.matches) : [];
  const expectedPerPair = data?.league.format === 'home_away' ? 2 : 1;
  const dvobojiPlayers = data ? data.standings.map(s => s.player).filter(Boolean) as Player[] : [];
  const selectedPlayer = dvobojiPlayers.find(p => p.id === dvobojiPlayerId) ?? dvobojiPlayers[0];

  const dvobojiOpponents = selectedPlayer
    ? dvobojiPlayers
        .filter(p => p.id !== selectedPlayer.id)
        .map(opponent => {
          const between = allMatches.filter(m =>
            (m.homePlayer?.id === selectedPlayer.id && m.awayPlayer?.id === opponent.id) ||
            (m.homePlayer?.id === opponent.id && m.awayPlayer?.id === selectedPlayer.id),
          );
          const completed = between.filter(m => m.status === 'completed');
          let status: 'completed' | 'partial' | 'upcoming' | 'not_played';
          if (between.length === 0) status = 'not_played';
          else if (completed.length === 0) status = 'upcoming';
          else if (completed.length >= expectedPerPair) status = 'completed';
          else status = 'partial';
          return { opponent, between, completed, status };
        })
        .sort((a, b) => ({ not_played: 0, upcoming: 1, partial: 2, completed: 3 }[a.status] - { not_played: 0, upcoming: 1, partial: 2, completed: 3 }[b.status]))
    : [];

  const activePhase = data?.phases?.find(p => p.id === activePhaseKey);

  /* Dvoboji data for active phase */
  const phaseAllMatches = activePhase ? activePhase.groups.flatMap(g => g.matches) : [];
  const phasePlayers = activePhase ? activePhase.standings.map(s => s.player).filter(Boolean) as Player[] : [];
  const phaseSelectedPlayer = phasePlayers.find(p => p.id === dvobojiPlayerId) ?? phasePlayers[0];
  const phaseOpponents = phaseSelectedPlayer
    ? phasePlayers
        .filter(p => p.id !== phaseSelectedPlayer.id)
        .map(opponent => {
          const between = phaseAllMatches.filter(m =>
            (m.homePlayer?.id === phaseSelectedPlayer.id && m.awayPlayer?.id === opponent.id) ||
            (m.homePlayer?.id === opponent.id && m.awayPlayer?.id === phaseSelectedPlayer.id),
          );
          const completed = between.filter(m => m.status === 'completed');
          let status: 'completed' | 'partial' | 'upcoming' | 'not_played';
          if (between.length === 0) status = 'not_played';
          else if (completed.length === 0) status = 'upcoming';
          else if (completed.length >= expectedPerPair) status = 'completed';
          else status = 'partial';
          return { opponent, between, completed, status };
        })
        .sort((a, b) => ({ not_played: 0, upcoming: 1, partial: 2, completed: 3 }[a.status] - { not_played: 0, upcoming: 1, partial: 2, completed: 3 }[b.status]))
    : [];

  return (
    <div
      className="min-h-screen bg-[#0f172a] text-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Pull-to-refresh indicator ── */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-end pointer-events-none"
        animate={{ height: pullDistance > 0 ? pullDistance + 16 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="flex flex-col items-center gap-1 pb-2">
          {pullDistance >= PULL_THRESHOLD * 0.85 ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5, ease: 'easeInOut' }}>
              <RefreshCw className="w-5 h-5 text-orange-400" />
            </motion.div>
          ) : (
            <div style={{ animation: 'pullArrow 1s ease-in-out infinite' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v11M5 9l5 5 5-5" stroke="rgba(249,115,22,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <span className="text-[10px] text-orange-400/70 font-medium">
            {pullDistance >= PULL_THRESHOLD * 0.85 ? 'Pusti za osvežavanje' : 'Povuci za osvežavanje'}
          </span>
        </div>
      </motion.div>

      {/* ── Loading overlay ── */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#0c1220',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Center: orbiting dots + logo + text */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[
                { color: 'rgba(249,115,22,0.95)', size: 9 },
                { color: 'rgba(251,146,60,0.75)',  size: 7 },
                { color: 'rgba(249,115,22,0.55)',  size: 5 },
              ].map((dot, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: dot.size, height: dot.size,
                  borderRadius: '50%',
                  background: dot.color,
                  boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`,
                  animation: `orbitDot${i} 1.4s linear infinite`,
                }} />
              ))}
              <img
                src="/logo.svg"
                alt="Pikado"
                style={{
                  width: 80, height: 80,
                  borderRadius: 16,
                  position: 'relative',
                  zIndex: 1,
                  animation: 'logoBreath 1.6s ease-in-out infinite',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, letterSpacing: 1 }}>Pikado</span>
              <span style={{ color: '#94a3b8', fontSize: 14 }}>Učitavanje...</span>
            </div>
          </div>
        </div>
      )}
      {/* ── Header ── */}
      <style>{`
        @keyframes orbitDot0 {
          from { transform: rotate(0deg)   translateX(50px) rotate(0deg);    }
          to   { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
        }
        @keyframes orbitDot1 {
          from { transform: rotate(120deg) translateX(50px) rotate(-120deg); }
          to   { transform: rotate(480deg) translateX(50px) rotate(-480deg); }
        }
        @keyframes orbitDot2 {
          from { transform: rotate(240deg) translateX(50px) rotate(-240deg); }
          to   { transform: rotate(600deg) translateX(50px) rotate(-600deg); }
        }
        @keyframes logoBreath {
          0%, 100% { box-shadow: 0 0 18px 4px rgba(249,115,22,0.4), 0 0 40px 8px rgba(249,115,22,0.15); }
          50%       { box-shadow: 0 0 32px 8px rgba(249,115,22,0.75), 0 0 70px 16px rgba(249,115,22,0.3); }
        }
        @keyframes pullArrow {
          0%   { transform: translateY(-4px); opacity: 0.4; }
          50%  { transform: translateY(4px);  opacity: 1;   }
          100% { transform: translateY(-4px); opacity: 0.4; }
        }
        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 0 5px 1px rgba(250,204,21,0.35), 0 0 12px 2px rgba(250,204,21,0.15); }
          50%       { box-shadow: 0 0 10px 3px rgba(250,204,21,0.7),  0 0 22px 5px rgba(250,204,21,0.3);  }
        }
        @keyframes silverGlow {
          0%, 100% { box-shadow: 0 0 5px 1px rgba(203,213,225,0.25), 0 0 10px 2px rgba(203,213,225,0.1); }
          50%       { box-shadow: 0 0 9px 3px rgba(203,213,225,0.55), 0 0 18px 4px rgba(203,213,225,0.2); }
        }
        @keyframes bronzeGlow {
          0%, 100% { box-shadow: 0 0 5px 1px rgba(217,119,6,0.3),   0 0 10px 2px rgba(217,119,6,0.12); }
          50%       { box-shadow: 0 0 9px 3px rgba(217,119,6,0.6),   0 0 18px 4px rgba(217,119,6,0.25); }
        }
        @keyframes neonBorderPulse {
          0%, 100% { box-shadow: 0 -1px 8px rgba(249,115,22,0.15), inset 0 -1px 0 rgba(249,115,22,0.25); }
          50%       { box-shadow: 0 -1px 18px rgba(249,115,22,0.45), inset 0 -1px 0 rgba(249,115,22,0.55); }
        }
        @keyframes neonLogoGlow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(249,115,22,0.25), 0 0 20px 4px rgba(249,115,22,0.08); }
          50%       { box-shadow: 0 0 14px 4px rgba(249,115,22,0.55), 0 0 36px 8px rgba(249,115,22,0.18); }
        }
        @keyframes emberFloat1 {
          0%   { transform: translateY(0px)   translateX(0px);  opacity: 0; }
          8%   { opacity: 0.9; }
          100% { transform: translateY(-72px) translateX(7px);  opacity: 0; }
        }
        @keyframes emberFloat2 {
          0%   { transform: translateY(0px)   translateX(0px);  opacity: 0; }
          8%   { opacity: 0.7; }
          100% { transform: translateY(-65px) translateX(-5px); opacity: 0; }
        }
        @keyframes emberFloat3 {
          0%   { transform: translateY(0px)   translateX(0px);  opacity: 0; }
          8%   { opacity: 0.8; }
          100% { transform: translateY(-78px) translateX(3px);  opacity: 0; }
        }
      `}</style>
      <div
        className="relative overflow-hidden px-4"
        style={{
          background: '#0c1220',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(249,115,22,0.25)',
          animation: 'neonBorderPulse 3s ease-in-out infinite',
          zIndex: 0,
        }}
      >
        {/* Ember / spark particles */}
        {!loading && [
          { left: '6%',  size: 2, dur: '2.2s', delay: '0.0s', anim: 1 },
          { left: '13%', size: 3, dur: '1.9s', delay: '0.8s', anim: 2 },
          { left: '22%', size: 2, dur: '2.6s', delay: '0.3s', anim: 3 },
          { left: '31%', size: 4, dur: '2.0s', delay: '1.4s', anim: 1 },
          { left: '40%', size: 2, dur: '2.4s', delay: '0.6s', anim: 2 },
          { left: '50%', size: 3, dur: '1.7s', delay: '2.0s', anim: 3 },
          { left: '59%', size: 2, dur: '2.8s', delay: '0.4s', anim: 1 },
          { left: '68%', size: 4, dur: '2.1s', delay: '1.1s', anim: 2 },
          { left: '77%', size: 2, dur: '2.3s', delay: '0.2s', anim: 3 },
          { left: '85%', size: 3, dur: '1.8s', delay: '1.7s', anim: 1 },
          { left: '92%', size: 2, dur: '2.5s', delay: '0.9s', anim: 2 },
          { left: '17%', size: 2, dur: '2.0s', delay: '2.4s', anim: 3 },
          { left: '73%', size: 3, dur: '2.7s', delay: '1.3s', anim: 1 },
        ].map((e, i) => (
          <div
            key={i}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: e.left,
              bottom: '6px',
              width: e.size,
              height: e.size,
              background: e.size >= 3 ? 'rgba(251,146,60,0.95)' : 'rgba(249,115,22,0.85)',
              boxShadow: e.size >= 3 ? `0 0 ${e.size * 2}px rgba(249,115,22,0.7)` : undefined,
              animation: `emberFloat${e.anim} ${e.dur} ${e.delay} ease-out infinite`,
            }}
          />
        ))}

        <motion.div
          className="relative max-w-lg lg:max-w-5xl mx-auto flex items-center gap-3 lg:gap-5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.img
            src="/logo.svg"
            alt="Pikado"
            className="w-9 h-9 lg:w-12 lg:h-12 rounded-xl shrink-0 relative"
            style={{ animation: 'neonLogoGlow 3s ease-in-out infinite' }}
            animate={{
              x: [0, -5, 5, -4, 4, -2, 2, -1, 1, 0],
              y: [0,  3, -2,  2, -1,  1, -1,  0, 0, 0],
              rotate: [0, -2, 2, -1.5, 1.5, -0.5, 0.5, 0, 0, 0],
            }}
            transition={{ duration: 0.55, delay: 0.4, ease: 'easeOut' }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-base lg:text-xl font-bold text-white truncate leading-tight">
              {loading && !data ? '...' : (data?.league?.name ?? 'Nepoznata liga')}
            </h1>
            {data && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {data.league.status === 'active' && (
                  <span className="relative flex w-1.5 h-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-green-400" />
                  </span>
                )}
                <span className="text-[11px] font-semibold" style={{ color: data.league.status === 'active' ? '#4ade80' : '#94a3b8' }}>
                  {data.league.status === 'active' ? 'U toku' : data.league.status === 'completed' ? 'Završena' : 'Čeka početak'}
                </span>
              </div>
            )}
          </div>
          <motion.button
            onClick={() => { setRefreshSpinKey(k => k + 1); load(); }}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-xl disabled:opacity-40"
            style={{ backgroundColor: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)' }}
            whileTap={{ scale: 0.88 }}
          >
            <motion.span
              key={refreshSpinKey}
              className="flex items-center justify-center"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <RefreshCw className="w-4 h-4 text-orange-400" />
            </motion.span>
          </motion.button>
        </motion.div>
      </div>

      {/* ── Sticky nav ── */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
        <div className="max-w-lg lg:max-w-5xl mx-auto">

          {/* Phase tabs — samo ako postoje faze */}
          {data && data.phases.length > 0 && (() => {
            const phaseList = [
              ...(data.groups.length > 0 && data.phases.length === 0 ? [{ id: 'regular', name: 'Regularna', status: '' }] : []),
              ...data.phases,
            ];
            return (
              <div className="px-3 pt-2.5 pb-0">
                <div className="flex bg-slate-800/70 rounded-full p-1">
                  {phaseList.map(phase => {
                    const isActive = activePhaseKey === phase.id;
                    const isLive = phase.id !== 'regular' && (phase as PhaseData).status === 'active';
                    return (
                      <button
                        key={phase.id}
                        onClick={() => { setActivePhaseKey(phase.id); setActiveTab('tabela'); setExpandedGroups(new Set()); setExpandedPairs(new Set()); setDvobojiPlayerId(''); }}
                        className="relative flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold whitespace-nowrap"
                      >
                        {isActive && (
                          <motion.div
                            layoutId="phase-pill"
                            className="absolute inset-0 rounded-full bg-orange-500"
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                            style={{ boxShadow: '0 0 12px rgba(249,115,22,0.45)' }}
                          />
                        )}
                        <span className={`relative z-10 transition-colors duration-150 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                          {phase.name}
                        </span>
                        {isLive && <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Sub-tabs */}
          {(() => {
            const isKnockout = activePhaseKey !== 'regular' && activePhase?.type === 'knockout';
            const tabs = isKnockout
              ? [{ id: 'mecevi' as ActiveTab, label: 'Mečevi' }]
              : [
                  { id: 'tabela' as ActiveTab, label: 'Tabela' },
                  { id: 'mecevi' as ActiveTab, label: 'Mečevi' },
                  { id: 'dvoboji' as ActiveTab, label: 'Dvoboji' },
                ];
            return (
              <div className="px-3 py-2.5">
                <div className="relative flex bg-slate-800/70 rounded-full p-1">
                  {tabs.map(t => {
                    const isActive = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className="relative flex-1 flex items-center justify-center py-1.5 text-xs font-semibold whitespace-nowrap"
                      >
                        {isActive && (
                          <motion.div
                            layoutId="subtab-pill"
                            className="absolute inset-0 rounded-full bg-slate-600"
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          />
                        )}
                        <span className={`relative z-10 transition-colors duration-150 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="max-w-lg lg:max-w-5xl mx-auto px-3 lg:px-6 py-4">

        {/* Skeleton */}
        {loading && !data && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />)}
          </div>
        )}

        {/* ── Phase content ── */}
        {!loading && data && activePhaseKey !== 'regular' && activePhase && (
          <>
            {activeTab === 'tabela' && activePhase.type === 'round_robin' && <StandingsTable standings={activePhase.standings} />}
            {activeTab === 'mecevi' && <MatchGroups groups={activePhase.groups} expandedGroups={expandedGroups} toggleGroup={toggleGroup} groupLabel={g => activePhase.type === 'knockout' ? `Mečevi` : data.isEuroleague ? `Ligaški Dan ${g.label}` : `Kolo ${g.label}`} />}
            {activeTab === 'dvoboji' && activePhase.type === 'round_robin' && <DvobojiTab players={phasePlayers} opponents={phaseOpponents} selectedPlayerId={dvobojiPlayerId || phaseSelectedPlayer?.id || ''} expectedPerPair={expectedPerPair} onPlayerChange={id => { setDvobojiPlayerId(id); setExpandedPairs(new Set()); }} expandedPairs={expandedPairs} togglePair={togglePair} selectedPlayer={phaseSelectedPlayer} />}
          </>
        )}

        {/* ── Regular season content ── */}
        {!loading && data && activePhaseKey === 'regular' && (
          <>
            {activeTab === 'tabela' && <StandingsTable standings={data.standings} />}
            {activeTab === 'mecevi' && <MatchGroups groups={data.groups} expandedGroups={expandedGroups} toggleGroup={toggleGroup} groupLabel={groupLabel} />}
            {activeTab === 'dvoboji' && <DvobojiTab players={dvobojiPlayers} opponents={dvobojiOpponents} selectedPlayerId={dvobojiPlayerId || selectedPlayer?.id || ''} expectedPerPair={expectedPerPair} onPlayerChange={id => { setDvobojiPlayerId(id); setExpandedPairs(new Set()); }} expandedPairs={expandedPairs} togglePair={togglePair} selectedPlayer={selectedPlayer} />}
          </>
        )}

        {lastUpdated && (
          <p className="text-center text-[11px] text-slate-600 mt-5 pb-2">
            Osveženo u {lastUpdated.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
