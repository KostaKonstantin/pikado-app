'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import api from '@/lib/api/client';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { LeagueSkeleton } from '@/components/ui/skeleton';
import { generateRoundPDF } from '@/lib/pdf/roundPdf';
import { generateStandingsPDF } from '@/lib/pdf/standingsPdf';
import { generateScoresheetPDF } from '@/lib/pdf/scoresheetPdf';
import { generatePlayerSheetPDF } from '@/lib/pdf/playerSheetPdf';
import {
  ArrowLeft, Plus, Trash2, BarChart3, Users, Calendar,
  AlertCircle, X, ArrowLeftRight, Ban, ChevronRight,
  Trophy, Target, Zap, CheckCircle2, Download, Lock, Unlock,
  UserCheck, ChevronDown, ChevronUp, QrCode, Copy, Check, Search,
  MoreHorizontal, Grid3x3, Loader2,
} from 'lucide-react';
import QRCodeSVG from 'react-qr-code';
import { DartAvatar } from '@/components/ui/dart-avatar';

type Tab = 'tabela' | 'raspored' | 'odlozeni' | 'igraci' | 'matrica';

/* ─── helpers ──────────────────────────────────────────────────────── */

/** Local Avatar shim */
function Avatar({ name, size = 'sm', winRate, rank }: { name?: string; player?: any; size?: 'sm' | 'md' | 'lg'; winRate?: number; rank?: number }) {
  return <DartAvatar name={name} size={size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm'} winRate={winRate} rank={rank} animate={rank !== undefined && rank <= 3} />;
}

function RankBadge({ pos }: { pos: number }) {
  const cls =
    pos === 1 ? 'bg-yellow-400 text-black' :
    pos === 2 ? 'bg-slate-300 text-black' :
    pos === 3 ? 'bg-amber-600 text-white' :
                'bg-slate-700 text-slate-400';
  return (
    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold shrink-0 ${cls}`}>
      {pos}
    </span>
  );
}

function PlayerCombobox({
  value,
  onChange,
  players,
  excludeId,
  placeholder = '— Pretraži igrača —',
}: {
  value: string;
  onChange: (id: string) => void;
  players: any[];
  excludeId?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedPlayer = players.find((lp: any) => lp.playerId === value);
  const filtered = players.filter(
    (lp: any) =>
      lp.playerId !== excludeId &&
      (lp.player?.fullName ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (open) {
      // Skip autofocus on touch devices — keyboard popping up compresses the modal viewport
      const isTouch =
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      if (!isTouch) setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const select = (lp: any) => {
    onChange(lp.playerId);
    setOpen(false);
    setQuery('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(false);
  };

  /* ── closed: show selected player or placeholder button ── */
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="input-field w-full text-sm text-left flex items-center justify-between gap-2 min-h-[44px]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedPlayer && <Avatar name={selectedPlayer.player?.fullName} player={selectedPlayer.player} size="sm" />}
          <span className={`truncate ${selectedPlayer ? 'text-white' : 'text-slate-500'}`}>
            {selectedPlayer ? selectedPlayer.player?.fullName : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <span
              onClick={clear}
              className="text-slate-500 hover:text-white transition-colors text-xs p-0.5 rounded"
            >
              ✕
            </span>
          )}
          <Search className="w-4 h-4 text-slate-500" />
        </div>
      </button>
    );
  }

  /* ── open: inline search + list (no absolute positioning) ── */
  return (
    <div className="rounded-xl border border-orange-500/40 bg-slate-900 overflow-hidden">
      {/* Search row */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/80">
        <Search className="w-4 h-4 text-orange-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pretraži igrača..."
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-500 min-w-0"
        />
        <button
          type="button"
          onClick={() => { setOpen(false); setQuery(''); }}
          className="text-slate-400 hover:text-white transition-colors p-0.5 rounded shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Player list — scrollable, max 5 rows visible */}
      <div className="max-h-[220px] overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-xs px-3 py-3 text-center">Nema rezultata</p>
        ) : (
          filtered.map((lp: any) => (
            <button
              key={lp.playerId}
              type="button"
              onClick={() => select(lp)}
              className={`w-full text-left px-3 py-3 text-sm transition-colors flex items-center gap-2.5 border-b border-slate-800/60 last:border-0 ${
                lp.playerId === value
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-slate-200 active:bg-slate-700 hover:bg-slate-800'
              }`}
            >
              <Avatar name={lp.player?.fullName} player={lp.player} size="sm" />
              <span className="truncate font-medium">{lp.player?.fullName}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── ShareModal ────────────────────────────────────────────────────── */
function ShareModal({
  leagueId, shareToken, shareLoading, setShareToken, setShareLoading, copied, setCopied, onClose,
}: {
  leagueId: string | undefined;
  shareToken: string | null;
  shareLoading: boolean;
  setShareToken: (t: string) => void;
  setShareLoading: (v: boolean) => void;
  copied: boolean;
  setCopied: (v: boolean) => void;
  onClose: () => void;
}) {
  const origin = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : '';
  const shareUrl = shareToken ? `${origin}/share/${shareToken}` : null;

  useEffect(() => {
    if (shareToken || !leagueId) return;
    setShareLoading(true);
    api.post('/share/generate', { leagueId })
      .then((res) => setShareToken(res.data.token))
      .catch(() => {/* silently fail — user can close and retry */})
      .finally(() => setShareLoading(false));
  }, [leagueId]);

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <QrCode className="w-4 h-4 text-orange-400" /> Podeli ligu
        </h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-5">
        Skeniraj QR ili podeli link. Primaoci vide tabelu i mečeve — bez prijave, samo za čitanje.
      </p>

      {shareLoading || !shareUrl ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Generišem link...</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-5">
            <div className="bg-white p-4 rounded-2xl shadow-xl">
              <QRCodeSVG value={shareUrl} size={200} />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-700">
            <span className="text-xs text-slate-400 flex-1 truncate font-mono">{shareUrl}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors font-medium shrink-0"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Kopirano</> : <><Copy className="w-3.5 h-3.5" /> Kopiraj</>}
            </button>
          </div>

          <p className="text-[11px] text-slate-600 mt-3 text-center">
            Tabela i mečevi se automatski osvežavaju svakih 30 sekundi
          </p>
        </>
      )}
    </Modal>
  );
}

/* ─── main component ────────────────────────────────────────────────── */
export default function LeagueDetailPage() {
  const params = useParams();
  const { club, role } = useAuthStore();
  const id = params.id as string;

  const [league, setLeague]       = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures]   = useState<any[]>([]);
  const [lPlayers, setLPlayers]   = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [tab, setTab]             = useState<Tab>('tabela');
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats]         = useState<any>(null);

  // Match result modal
  const [editMatch, setEditMatch]       = useState<any>(null);
  const [matchScores, setMatchScores]   = useState({ home: 0, away: 0 });

  // Postpone modal
  const [postponeMatch, setPostponeMatch] = useState<any>(null);
  const [postponeDate, setPostponeDate]   = useState('');
  const [postponeSaving, setPostponeSaving] = useState(false);

  // Walkover modal
  const [walkoverMatch, setWalkoverMatch] = useState<any>(null);
  const [walkoverId, setWalkoverId]       = useState('');
  const [walkoverSaving, setWalkoverSaving] = useState(false);

  // Player detail modal
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  // Sessions
  const [sessions, setSessions]               = useState<any[]>([]);
  const [newSessionOpen, setNewSessionOpen]   = useState(false);
  const [sessionPresent, setSessionPresent]   = useState<Set<string>>(new Set());
  const [sessionMaxPer, setSessionMaxPer]     = useState(1);
  const [sessionDate, setSessionDate]         = useState('');
  const [sessionPreview, setSessionPreview]   = useState<any>(null);
  const [previewLoading, setPreviewLoading]   = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionManualMode, setSessionManualMode] = useState(false);
  const [closingSession, setClosingSession]   = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Mobile bottom action bar
  const [showMoreSheet, setShowMoreSheet]       = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [bottomBarVisible, setBottomBarVisible] = useState(true);
  const lastScrollRef = useRef(0);

  // Substitution history
  const [substitutions, setSubstitutions] = useState<any[]>([]);

  // Substitution modal (round mode only)
  const [subEvening, setSubEvening]           = useState<number | null>(null);
  const [subPairs, setSubPairs]               = useState<{ absentId: string; substituteId: string }[]>([{ absentId: '', substituteId: '' }]);
  const [subPreview, setSubPreview]           = useState<any>(null);
  const [subPreviewLoading, setSubPreviewLoading] = useState(false);
  const [subSaving, setSubSaving]             = useState(false);

  // QR code modal
  const [showQr, setShowQr]       = useState(false);
  const [copied, setCopied]       = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  // Matrix tab
  const [matrixCell, setMatrixCell]           = useState<{ aId: string; bId: string } | null>(null);
  const [matrixHighlight, setMatrixHighlight] = useState<string | null>(null);
  const [matrixFilter, setMatrixFilter]       = useState<'all' | 'not_played' | 'partial' | 'completed' | 'upcoming'>('all');
  const [matrixMobilePlayer, setMatrixMobilePlayer] = useState<string>('');

  // EvroLiga phase state
  const [phases,           setPhases]           = useState<any[]>([]);
  const [activePhaseView,  setActivePhaseView]  = useState<string>('');  // phaseId currently displayed
  const [phaseFixtures,    setPhaseFixtures]    = useState<any[]>([]);
  const [phaseStandings,   setPhaseStandings]   = useState<any[]>([]);
  const [phaseLoading,     setPhaseLoading]     = useState(false);
  const [advancingPhase,         setAdvancingPhase]         = useState(false);
  const [showAdvancePhaseModal,  setShowAdvancePhaseModal]  = useState(false);
  const [phaseTab,         setPhaseTab]         = useState<'tabela' | 'raspored' | 'bracket' | 'igraci' | 'matrica'>('tabela');
  const [phaseMatchModal,  setPhaseMatchModal]  = useState<any | null>(null);
  const [phaseHomeScore,   setPhaseHomeScore]   = useState(0);
  const [phaseAwayScore,   setPhaseAwayScore]   = useState(0);
  const [phaseSaveLoading, setPhaseSaveLoading] = useState(false);

  // PDF download
  const [downloadingRound, setDownloadingRound]             = useState<number | null>(null);
  const [downloadingStandings, setDownloadingStandings]     = useState(false);
  const [downloadingScoresheet, setDownloadingScoresheet]   = useState<string | null>(null);
  const [downloadingPlayerSheet, setDownloadingPlayerSheet] = useState(false);

  const handleDownloadScoresheet = async (session: any, matches: any[]) => {
    setDownloadingScoresheet(session.id);
    try {
      await generateScoresheetPDF({
        leagueName:    league?.name ?? '',
        sessionNumber: session.sessionNumber,
        sessionDate:   session.sessionDate,
        matches,
        setsPerMatch:  league?.setsPerMatch,
        legsPerSet:    league?.legsPerSet,
      });
    } finally { setDownloadingScoresheet(null); }
  };

  const handleDownloadPlayerSheet = async () => {
    setDownloadingPlayerSheet(true);
    try {
      await generatePlayerSheetPDF({
        leagueName: league.name,
        players: lPlayers.map((lp: any) => ({ id: lp.playerId, fullName: lp.player?.fullName ?? '—' })),
        fixtures,
      });
    } finally {
      setDownloadingPlayerSheet(false);
    }
  };

  const handleDownloadStandings = async () => {
    setDownloadingStandings(true);
    try {
      if (activePhaseView) {
        const phaseName = phases.find((p: any) => p.id === activePhaseView)?.name ?? '';
        // Phase standings use wins/draws/losses; PDF interface expects won/drawn/lost
        const normalised = phaseStandings.map((s: any) => ({
          ...s,
          won:   s.won   ?? s.wins   ?? 0,
          drawn: s.drawn ?? s.draws  ?? 0,
          lost:  s.lost  ?? s.losses ?? 0,
        }));
        await generateStandingsPDF({
          leagueName: phaseName ? `${league.name} – ${phaseName}` : league.name,
          standings: normalised,
          stats,
        });
      } else {
        await generateStandingsPDF({ leagueName: league.name, standings, stats });
      }
    } finally {
      setDownloadingStandings(false);
    }
  };

  const handleDownloadPDF = async (roundNumber: number, matches: any[]) => {
    setDownloadingRound(roundNumber);
    try {
      await generateRoundPDF({ leagueName: league.name, roundNumber, matches });
    } finally {
      setDownloadingRound(null);
    }
  };

  /* ── session actions ─────────────────────────────────────── */
  const openNewSession = () => {
    // Use phase-scoped players for EuroLeague, all players otherwise
    setSessionPresent(new Set(sessionModalPlayers.map((lp: any) => lp.playerId)));
    setSessionMaxPer(1);
    setSessionDate('');
    setSessionPreview(null);
    setSessionManualMode(false);
    setNewSessionOpen(true);
  };

  const togglePresent = (playerId: string) => {
    setSessionPresent((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId); else next.add(playerId);
      return next;
    });
    setSessionPreview(null);
  };

  const loadPreview = async () => {
    if (!club?.id || sessionPresent.size < 2) return;
    setPreviewLoading(true);
    try {
      const data = await leaguesApi.previewSession(club.id, id, {
        presentPlayerIds: [...sessionPresent],
        maxMatchesPerPlayer: sessionMaxPer,
      });
      setSessionPreview(data);
    } finally { setPreviewLoading(false); }
  };

  const handleCreateSession = async () => {
    if (!club?.id) return;
    if (!sessionManualMode && sessionPresent.size < 2) return;
    setCreatingSession(true);
    try {
      const newSession = await leaguesApi.createSession(club.id, id, sessionManualMode
        ? { presentPlayerIds: [], sessionDate: sessionDate || null, manualMode: true }
        : { presentPlayerIds: [...sessionPresent], maxMatchesPerPlayer: sessionMaxPer, sessionDate: sessionDate || null }
      );
      setNewSessionOpen(false);
      setSessionPreview(null);
      setExpandedSessions((prev) => new Set([...prev, newSession.id]));
      await load();
      if (activePhaseView) await loadPhaseData(activePhaseView);
      // In manual mode, immediately open the build-mode dialog for the new session
      if (sessionManualMode) {
        openManualMatch(newSession, true);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Greška pri kreiranju sesije');
    } finally { setCreatingSession(false); }
  };

  const handleCloseSession = async (sessionId: string) => {
    if (!club?.id) return;
    setClosingSession(sessionId);
    try {
      await leaguesApi.closeSession(club.id, id, sessionId);
      await load();
      if (activePhaseView) await loadPhaseData(activePhaseView);
    } finally { setClosingSession(null); }
  };

  const handleDeleteSession = (sessionId: string) => {
    setDeleteSessionConfirm(sessionId);
  };

  const confirmDeleteSession = async () => {
    if (!club?.id || !deleteSessionConfirm) return;
    const sessionId = deleteSessionConfirm;
    setDeleteSessionConfirm(null);
    setDeletingSession(sessionId);
    try {
      await leaguesApi.deleteSession(club.id, id, sessionId);
      await load();
      if (activePhaseView) await loadPhaseData(activePhaseView);
    } finally { setDeletingSession(null); }
  };

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId); else next.add(sessionId);
      return next;
    });
  };

  /* ── substitution handlers (round mode) ──────────────────── */
  const openSubstitute = (eveningNum: number) => {
    setSubEvening(eveningNum);
    setSubPairs([{ absentId: '', substituteId: '' }]);
    setSubPreview(null);
  };

  const closeSubstitute = () => {
    setSubEvening(null);
    setSubPairs([{ absentId: '', substituteId: '' }]);
    setSubPreview(null);
  };

  const updateSubPair = (idx: number, field: 'absentId' | 'substituteId', value: string) => {
    const next = subPairs.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    setSubPairs(next);
    setSubPreview(null);
    // Auto-preview as soon as any pair is fully filled in
    if (next.some((p) => p.absentId && p.substituteId)) {
      loadSubPreviewWithPairs(next, true);
    }
  };

  const loadSubPreviewWithPairs = async (pairsToUse: { absentId: string; substituteId: string }[], silent = false) => {
    if (!club?.id || subEvening === null) return;
    const validPairs = pairsToUse.filter((p) => p.absentId && p.substituteId);
    if (validPairs.length === 0) return;
    setSubPreviewLoading(true);
    try {
      const data = await leaguesApi.previewSubstitutions(club.id, id, subEvening, validPairs);
      setSubPreview(data);
    } catch (e: any) {
      if (!silent) alert(e?.response?.data?.message ?? 'Greška pri pregledu zamene');
    } finally {
      setSubPreviewLoading(false);
    }
  };

  const loadSubPreview = () => loadSubPreviewWithPairs(subPairs);

  const saveSubstitute = async () => {
    if (!club?.id || subEvening === null) return;
    const validPairs = subPairs.filter((p) => p.absentId && p.substituteId);
    if (validPairs.length === 0) return;
    setSubSaving(true);
    try {
      await leaguesApi.applySubstitutions(club.id, id, subEvening, validPairs);
      closeSubstitute();
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Greška pri primeni zamene');
    } finally {
      setSubSaving(false);
    }
  };

  // Manual match modal
  const [manualMatchSession, setManualMatchSession] = useState<any>(null);
  const [manualHome, setManualHome] = useState('');
  const [manualAway, setManualAway] = useState('');
  const [manualCheck, setManualCheck] = useState<any>(null);
  const [manualChecking, setManualChecking] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  // Build mode: adding multiple matches in sequence (whole session manual entry)
  const [manualBuildMode, setManualBuildMode] = useState(false);
  const [manualAddedMatches, setManualAddedMatches] = useState<any[]>([]);

  const openManualMatch = (session: any, buildMode = false) => {
    setManualMatchSession(session);
    setManualHome('');
    setManualAway('');
    setManualCheck(null);
    setManualBuildMode(buildMode);
    setManualAddedMatches([]);
  };

  const closeManualMatch = () => {
    setManualMatchSession(null);
    setManualHome('');
    setManualAway('');
    setManualCheck(null);
    setManualBuildMode(false);
    setManualAddedMatches([]);
  };

  // Run check whenever either player changes.
  // No cancellation pattern — calls are short-lived & idempotent, and the cancelled-closure
  // approach caused the spinner to stick on mobile (touch scroll events triggered re-renders
  // that set cancelled=true just before the API call completed).
  useEffect(() => {
    if (!manualHome || !manualAway || manualHome === manualAway || !manualMatchSession || !club?.id) {
      setManualCheck(null);
      setManualChecking(false);
      return;
    }
    setManualChecking(true);
    setManualCheck(null);
    leaguesApi
      .checkManualMatch(club.id, id, manualMatchSession.id, manualHome, manualAway)
      .then((result) => { setManualCheck(result); })
      .catch((err) => {
        console.error('[checkManualMatch]', err);
        const msg = err?.response?.data?.message ?? 'Greška pri proveri meča';
        setManualCheck({ status: 'error', message: msg });
      })
      .finally(() => { setManualChecking(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualHome, manualAway, manualMatchSession?.id]);

  const handleAddManualMatch = async () => {
    if (!club?.id || !manualMatchSession || !manualHome || !manualAway) return;
    if (manualCheck?.status === 'blocked') return;
    setManualSaving(true);
    try {
      const added = await leaguesApi.addManualMatch(club.id, id, manualMatchSession.id, manualHome, manualAway);
      if (manualBuildMode) {
        // Stay in modal — reset pickers, append to running list
        setManualAddedMatches((prev) => [...prev, added]);
        setManualHome('');
        setManualAway('');
        setManualCheck(null);
        load(); // refresh page data in background (no await)
      } else {
        closeManualMatch();
        await load();
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Greška pri dodavanju meča');
    } finally { setManualSaving(false); }
  };

  // Multi-select players
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Player hub search / sort / add panel
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSort, setPlayerSort] = useState<'points' | 'name'>('points');
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  const toggleSelectPlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId); else next.add(playerId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!club?.id || selectedPlayerIds.size === 0) return;
    if (!confirm(`Ukloniti ${selectedPlayerIds.size} igrač(a) iz lige?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedPlayerIds].map((pid) => leaguesApi.removePlayer(club.id, id, pid)));
      setSelectedPlayerIds(new Set());
      await load();
    } finally { setBulkDeleting(false); }
  };

  // Bulk add players
  const [bulkText, setBulkText]       = useState('');
  const [bulkAdding, setBulkAdding]   = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{ added: number; created: number; skipped: number } | null>(null);
  const bulkRef = useRef<HTMLTextAreaElement>(null);

  const canEdit = role === 'club_admin' || role === 'organizer';

  /* ── data loading ────────────────────────────────────────── */
  const load = async () => {
    if (!club?.id) return;
    try {
      const [l, s, f, lp, ap, st, sess, subs] = await Promise.all([
        leaguesApi.getOne(club.id, id),
        leaguesApi.getStandings(club.id, id),
        leaguesApi.getFixtures(club.id, id),
        leaguesApi.getPlayers(club.id, id),
        playersApi.getAll(club.id),
        leaguesApi.getStats(club.id, id),
        leaguesApi.getSessions(club.id, id),
        leaguesApi.getSubstitutions(club.id, id).catch(() => []),
      ]);
      setLeague(l); setStandings(s); setFixtures(f);
      setLPlayers(lp); setAllPlayers(ap); setStats(st);
      setSessions(sess); setSubstitutions(subs);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [club?.id, id]);

  // Load EvroLiga phases whenever league data arrives
  const loadPhases = async (selectPhaseId?: string) => {
    if (!club?.id || !id) return;
    try {
      const ps: any[] = await leaguesApi.getPhases(club.id, id);
      setPhases(ps);
      const target = selectPhaseId || ps.find((p: any) => p.status === 'active')?.id || ps[0]?.id;
      if (target) {
        setActivePhaseView(target);
        await loadPhaseData(target);
      }
    } catch { /* not euroleague */ }
  };

  const loadPhaseData = async (phaseId: string) => {
    if (!club?.id) return;
    setPhaseLoading(true);
    try {
      const [fx, st, sess, phaseStats] = await Promise.all([
        leaguesApi.getPhaseFixtures(club.id, id, phaseId),
        leaguesApi.getPhaseStandings(club.id, id, phaseId),
        leaguesApi.getSessions(club.id, id, phaseId),
        leaguesApi.getStats(club.id, id, phaseId),
      ]);
      setPhaseFixtures(fx);
      setPhaseStandings(st);
      setSessions(sess);
      setStats(phaseStats);
    } finally { setPhaseLoading(false); }
  };

  useEffect(() => {
    if (league?.mode === 'euroleague' && club?.id) loadPhases();
  }, [league?.mode, club?.id, id]);

  // Auto-hide bottom bar on scroll down, show on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollRef.current + 10) setBottomBarVisible(false);
      else if (y < lastScrollRef.current - 10) setBottomBarVisible(true);
      lastScrollRef.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── actions ─────────────────────────────────────────────── */
  const addPlayer    = async (playerId: string) => { await leaguesApi.addPlayer(club!.id, id, playerId); load(); };
  const removePlayer = async (playerId: string) => { await leaguesApi.removePlayer(club!.id, id, playerId); load(); };

  const generate = async () => {
    if (lPlayers.length < 2) { alert('Potrebna su najmanje 2 igrača'); return; }
    setGenerating(true);
    try {
      if (league?.mode === 'euroleague') {
        await leaguesApi.initPhases(club!.id, id);
        await load();
        await loadPhases();
      } else {
        await leaguesApi.generateFixtures(club!.id, id);
        await load();
      }
    } finally { setGenerating(false); }
  };

  /* ── bulk player import ──────────────────────────────────── */
  const handleBulkAdd = async () => {
    if (!bulkText.trim() || !club?.id) return;
    setBulkAdding(true);
    setBulkFeedback(null);

    const names = bulkText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate

    const registeredIds = new Set(lPlayers.map((lp: any) => lp.playerId));
    let added = 0, created = 0, skipped = 0;

    for (const name of names) {
      // Check existing club players (case-insensitive)
      const existing = allPlayers.find(
        (p: any) => p.fullName.toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        if (registeredIds.has(existing.id)) { skipped++; continue; }
        await leaguesApi.addPlayer(club.id, id, existing.id);
        added++;
      } else {
        // Create new player then add
        const newPlayer = await playersApi.create(club.id, { fullName: name });
        await leaguesApi.addPlayer(club.id, id, newPlayer.id);
        created++;
      }
    }

    setBulkText('');
    setBulkFeedback({ added, created, skipped });
    await load();
    setBulkAdding(false);
    setTimeout(() => setBulkFeedback(null), 4000);
  };

  /* ── match validation ────────────────────────────────────── */
  const matchScoreError = (() => {
    if (!editMatch || !league) return '';
    const max = league.setsPerMatch === 1 ? league.legsPerSet : league.setsPerMatch;
    const { home, away } = matchScores;
    if (home < 0 || away < 0) return 'Rezultat ne može biti negativan';
    if (home > max || away > max) return `Maksimum je ${max}`;
    if (home === 0 && away === 0) return 'Rezultat ne može biti 0:0';
    const minScore = Math.min(home, away);
    const maxScore = Math.max(home, away);
    const decisive = maxScore === max && minScore < max - 1;
    const draw = home === away && home === max - 1;
    if (!decisive && !draw) return `Pobeda: ${max}:0 — ${max}:${max - 2} | Remi: ${max - 1}:${max - 1}`;
    return '';
  })();

  const saveMatchResult = async () => {
    if (!editMatch || matchScoreError) return;
    await leaguesApi.updateMatch(club!.id, id, editMatch.id, matchScores.home, matchScores.away);
    setEditMatch(null); load();
  };

  const saveWalkover = async () => {
    if (!walkoverMatch || !walkoverId || !club?.id) return;
    setWalkoverSaving(true);
    try { await leaguesApi.recordWalkover(club.id, id, walkoverMatch.id, walkoverId); setWalkoverMatch(null); setWalkoverId(''); load(); }
    finally { setWalkoverSaving(false); }
  };

  const savePostpone = async () => {
    if (!postponeMatch || !club?.id) return;
    setPostponeSaving(true);
    try {
      await leaguesApi.postponeMatch(club.id, id, postponeMatch.id, { scheduledDate: postponeDate || null, isPostponed: true });
      setPostponeMatch(null); setPostponeDate(''); load();
    } finally { setPostponeSaving(false); }
  };

  const cancelPostpone = async (match: any) => {
    if (!club?.id) return;
    await leaguesApi.postponeMatch(club.id, id, match.id, { scheduledDate: null, isPostponed: false });
    load();
  };

  /* ── computed ────────────────────────────────────────────── */

  // Mode driven by league.mode: 'session' = flexible evenings; 'round' = full upfront schedule
  const isSessionMode = league?.mode === 'session';
  const isEuroleague  = league?.mode === 'euroleague';

  // When in EuroLeague phase view, limit session player pool to that phase's players
  const sessionModalPlayers = isEuroleague && activePhaseView
    ? lPlayers.filter((lp: any) =>
        (phases.find((p: any) => p.id === activePhaseView)?.playerIds ?? []).includes(lp.playerId)
      )
    : lPlayers;

  // Computed for sticky mobile action bar
  const activeSessionForBar = sessions.find((s: any) => s.status === 'open');

  const byEvening: Record<number, any[]> = {};
  if (!isSessionMode) {
    for (const m of fixtures) {
      const s = m.sessionNumber ?? 1;
      if (!byEvening[s]) byEvening[s] = [];
      byEvening[s].push(m);
    }
  }

  const registeredIds = new Set(lPlayers.map((lp: any) => lp.playerId));
  const availablePlayers = allPlayers.filter((p: any) => !registeredIds.has(p.id));

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Player detail: matches involving a specific player
  const getPlayerMatches = (playerId: string) => {
    const completed: any[] = [];
    const remaining: string[] = [];
    const playedAgainst = new Set<string>();

    for (const m of fixtures) {
      const isHome = m.homePlayerId === playerId;
      const isAway = m.awayPlayerId === playerId;
      if (!isHome && !isAway) continue;

      const opponentId   = isHome ? m.awayPlayerId : m.homePlayerId;
      const opponentName = isHome ? m.awayPlayer?.fullName : m.homePlayer?.fullName;

      if (m.status === 'completed') {
        const myScore  = isHome ? m.homeSets : m.awaySets;
        const oppScore = isHome ? m.awaySets : m.homeSets;
        const outcome  = myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw';
        completed.push({ matchId: m.id, opponentId, opponentName, myScore, oppScore, outcome, isWalkover: m.isWalkover });
        playedAgainst.add(opponentId);
      }
    }

    for (const lp of lPlayers) {
      if (lp.playerId === playerId) continue;
      if (!playedAgainst.has(lp.playerId)) {
        remaining.push(lp.player?.fullName || lp.playerId);
      }
    }

    return { completed, remaining };
  };

  /* ── TABS ────────────────────────────────────────────────── */
  const postponedMatches = fixtures.filter((m: any) => m.isPostponed && m.status !== 'completed');

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = isEuroleague
    ? []
    : [
        { id: 'tabela',   label: 'Tabela',   icon: <BarChart3  className="w-3.5 h-3.5" /> },
        { id: 'raspored', label: 'Raspored', icon: <Calendar   className="w-3.5 h-3.5" /> },
        ...(!isSessionMode ? [{ id: 'odlozeni' as Tab, label: 'Odloženi', icon: <AlertCircle className="w-3.5 h-3.5" />, badge: postponedMatches.length }] : []),
        { id: 'igraci',   label: 'Igrači',   icon: <Users      className="w-3.5 h-3.5" /> },
        { id: 'matrica',  label: 'Matrica',  icon: <Grid3x3    className="w-3.5 h-3.5" /> },
      ];

  /* ── render ──────────────────────────────────────────────── */
  if (loading) return (
    <>
      <Topbar title="Liga" />
      <LeagueSkeleton />
    </>
  );
  if (!league) return null;

  return (
    <>
    <div className="animate-fade-in">
      <Topbar title={league.name} />

      <div className="p-4 md:p-6 space-y-5">

        {/* Back + Share */}
        <div className="flex items-center justify-between">
          <Link href="/leagues" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Sve lige
          </Link>
          <button
            onClick={() => setShowQr(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 hover:text-white transition-all"
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            Podeli
          </button>
        </div>

        {/* League stats bar — all values dynamic from formula, not hardcoded */}
        {stats && stats.playerCount >= 2 && (
          <div className="card px-4 py-3 animate-fade-in-up stagger-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <StatPill label="Igrači"  value={stats.playerCount} />
              <StatPill label="Rundi"   value={stats.expectedRounds}       hint={stats.isDoubleRoundRobin ? '2× krug' : '1× krug'} />
              <StatPill label="Ukupno mečeva" value={stats.expectedTotalMatches} />
              {stats.isGenerated && (
                <StatPill label="Odigrano"
                  value={`${stats.completedMatches}/${stats.expectedTotalMatches}`}
                  color="text-orange-400"
                  hint={`${stats.progressPct}%`}
                />
              )}
              {stats.hasOddPlayers && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Neparan broj igrača — BYE automatski dodat
                </span>
              )}
            </div>
            {stats.isGenerated && (
              <div className="mt-2 h-1 rounded-full overflow-hidden progress-track">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${stats.progressPct}%`,
                    background: 'linear-gradient(90deg, #f97316, #ea580c)',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab bar — hidden for EvroLiga (uses internal phase sub-tabs instead) */}
        {TABS.length > 0 && <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-0.5">
          <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  'flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap',
                  tab === t.id
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white',
                ].join(' ')}
              >
                {t.icon} {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>}

        {/* ══════════════════ TABELA ══════════════════════════ */}
        {tab === 'tabela' && !isEuroleague && (
          <div className="animate-fade-in-up space-y-4">

            {/* ── Action bar ─────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {fixtures.length > 0 && (
                  <button
                    onClick={handleDownloadPlayerSheet}
                    disabled={downloadingPlayerSheet}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-300 text-xs font-medium hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50"
                  >
                    {downloadingPlayerSheet
                      ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-300 rounded-full" />
                      : <Download className="w-3.5 h-3.5 shrink-0" />
                    }
                    <span className="hidden sm:inline">Lista igrača</span>
                  </button>
                )}
                {standings.length > 0 && (
                  <button
                    onClick={handleDownloadStandings}
                    disabled={downloadingStandings}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-all disabled:opacity-50"
                  >
                    {downloadingStandings
                      ? <span className="animate-spin w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-400 rounded-full" />
                      : <Download className="w-3.5 h-3.5 shrink-0" />
                    }
                    <span className="hidden sm:inline">Tabela PDF</span>
                  </button>
                )}
                {canEdit && (
                  <button onClick={generate} disabled={generating} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50">
                    {generating
                      ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full mr-1" />Generisanje...</>
                      : fixtures.length > 0 ? 'Regeneriši' : 'Generiši Raspored'
                    }
                  </button>
                )}
              </div>
            </div>

            {standings.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<BarChart3 className="w-10 h-10" />}
                  title="Nema podataka"
                  desc="Dodajte igrače i generišite raspored da biste videli tabelu."
                />
              </div>
            ) : (() => {
              const winRate = (s: any) => s.played > 0 ? Math.round((s.won / s.played) * 100) : 0;
              const top3 = standings.slice(0, 3);
              const bestWins = [...standings].sort((a, b) => b.won - a.won)[0];
              const mostSets = [...standings].sort((a, b) => b.setsFor - a.setsFor)[0];
              const ptGap = standings.length > 1 ? standings[0].points - standings[1].points : 0;
              const top5wr = standings.slice(0, Math.min(5, standings.length));
              const maxWr = Math.max(...top5wr.map(winRate), 1);

              const medalColor = (pos: number) =>
                pos === 1 ? 'rgba(234,179,8,0.12)'  :
                pos === 2 ? 'rgba(148,163,184,0.10)' :
                            'rgba(180,83,9,0.10)';
              const medalBorder = (pos: number) =>
                pos === 1 ? 'rgba(234,179,8,0.30)'  :
                pos === 2 ? 'rgba(148,163,184,0.25)' :
                            'rgba(180,83,9,0.28)';
              const medalText = (pos: number) =>
                pos === 1 ? '#facc15' : pos === 2 ? '#cbd5e1' : '#f97316';
              const medalEmoji = (pos: number) =>
                pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';

              return (
                <>
                  {/* ── TOP 3 PODIUM ─────────────────────────────── */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {top3.map((s, i) => (
                      <div
                        key={s.player?.id}
                        onClick={() => setSelectedPlayer(lPlayers.find((lp: any) => lp.playerId === s.player?.id))}
                        className={`rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                          s.position === 1 ? 'animate-fade-in-up' : 'animate-fade-in-up'
                        }`}
                        style={{
                          backgroundColor: medalColor(s.position),
                          border: `1px solid ${medalBorder(s.position)}`,
                          boxShadow: s.position === 1
                            ? '0 0 24px rgba(234,179,8,0.08), 0 4px 16px rgba(0,0,0,0.2)'
                            : '0 2px 8px rgba(0,0,0,0.12)',
                          animationDelay: `${i * 60}ms`,
                        }}
                      >
                        <span className="text-xl sm:text-2xl leading-none">{medalEmoji(s.position)}</span>
                        <Avatar name={s.player?.fullName} player={s.player} size="lg" winRate={winRate(s)} rank={s.position} />
                        <div className="text-center min-w-0 w-full">
                          <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                            {s.player?.fullName?.split(' ')[0]}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                            {s.player?.fullName?.split(' ').slice(1).join(' ')}
                          </p>
                        </div>
                        <div className="flex flex-col items-center">
                          <span
                            className="text-lg sm:text-2xl font-black tabular-nums leading-none"
                            style={{ color: medalText(s.position) }}
                          >
                            {s.points}
                          </span>
                          <span className="text-[10px] text-slate-500">bod.</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {winRate(s)}% pobeda
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── INSIGHTS ─────────────────────────────────── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { icon: <Trophy className="w-3.5 h-3.5 text-yellow-400" />, label: 'Lider', value: standings[0]?.player?.fullName?.split(' ')[0], sub: `${standings[0]?.points} bod.`, color: 'text-yellow-400' },
                      { icon: <Zap className="w-3.5 h-3.5 text-green-400" />, label: 'Najviše pobeda', value: bestWins?.player?.fullName?.split(' ')[0], sub: `${bestWins?.won} P`, color: 'text-green-400' },
                      { icon: <Target className="w-3.5 h-3.5 text-orange-400" />, label: 'Najviše setova', value: mostSets?.player?.fullName?.split(' ')[0], sub: `${mostSets?.setsFor} L+`, color: 'text-orange-400' },
                      { icon: <BarChart3 className="w-3.5 h-3.5 text-blue-400" />, label: 'Prednost #1', value: ptGap === 0 ? 'Izjednačeno' : `+${ptGap}`, sub: ptGap === 0 ? '—' : 'bodova pred #2', color: 'text-blue-400' },
                    ].map((ins, i) => (
                      <div
                        key={ins.label}
                        className="card p-3 animate-fade-in-up"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {ins.icon}
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{ins.label}</span>
                        </div>
                        <p className={`text-sm font-bold truncate ${ins.color}`}>{ins.value}</p>
                        <p className="insight-sub">{ins.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── WIN RATE CHART ────────────────────────────── */}
                  <div className="card p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      % Pobeda · Top {top5wr.length}
                    </p>
                    <div className="space-y-2.5">
                      {top5wr.map((s, i) => {
                        const wr = winRate(s);
                        return (
                          <div key={s.player?.id} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                            <span className="text-[11px] text-slate-500 w-4 tabular-nums text-right shrink-0">{i + 1}</span>
                            <span className="text-xs text-slate-300 w-20 truncate shrink-0">{s.player?.fullName?.split(' ')[0]}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden progress-track">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${(wr / maxWr) * 100}%`,
                                  background: i === 0
                                    ? 'linear-gradient(90deg,#facc15,#f97316)'
                                    : 'linear-gradient(90deg,#f97316,#fb923c)',
                                  animationDelay: `${i * 80}ms`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold tabular-nums w-8 text-right shrink-0" style={{ color: i === 0 ? '#facc15' : '#fb923c' }}>
                              {wr}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── FULL TABLE ───────────────────────────────── */}
                  <div className="card" style={{ overflow: 'clip' }}>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                            {['#', 'Igrač', 'M', 'P', 'R', 'G', 'L+', 'L−', 'Bod.'].map((h) => (
                              <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((s, idx) => (
                            <tr
                              key={s.player?.id || s.position}
                              onClick={() => setSelectedPlayer(lPlayers.find((lp: any) => lp.playerId === s.player?.id))}
                              className="cursor-pointer transition-colors animate-fade-in table-row-hover"
                              style={{
                                borderBottom: '1px solid var(--border)',
                                backgroundColor: s.position === 1 ? 'rgba(234,179,8,0.03)' : undefined,
                                animationDelay: `${idx * 25}ms`,
                              }}
                            >
                              <td className="px-4 py-3 w-10">
                                <RankBadge pos={s.position} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={s.player?.fullName} player={s.player} winRate={winRate(s)} rank={s.position} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-white text-sm truncate">{s.player?.fullName}</span>
                                      {s.position === 1 && <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <div className="h-1 w-12 rounded-full overflow-hidden progress-track">
                                        <div
                                          className="h-full rounded-full"
                                          style={{
                                            width: `${winRate(s)}%`,
                                            backgroundColor: winRate(s) >= 60 ? '#4ade80' : winRate(s) >= 40 ? '#fb923c' : '#f87171',
                                          }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{winRate(s)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-400 tabular-nums">{s.played}</td>
                              <td className="px-4 py-3 font-semibold text-green-400 tabular-nums">{s.won}</td>
                              <td className="px-4 py-3 font-medium text-yellow-400 tabular-nums">{s.drawn}</td>
                              <td className="px-4 py-3 font-medium text-red-400 tabular-nums">{s.lost}</td>
                              <td className="px-4 py-3 text-slate-300 tabular-nums">{s.setsFor}</td>
                              <td className="px-4 py-3 text-slate-500 tabular-nums">{s.setsAgainst}</td>
                              <td className="px-4 py-3">
                                <span className="text-lg font-black text-orange-400 tabular-nums leading-none">{s.points}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                      {standings.map((s, idx) => (
                        <div
                          key={s.player?.id || s.position}
                          onClick={() => setSelectedPlayer(lPlayers.find((lp: any) => lp.playerId === s.player?.id))}
                          className="px-4 py-3.5 cursor-pointer active:bg-slate-800/50 transition-colors animate-fade-in"
                          style={{
                            backgroundColor: s.position === 1 ? 'rgba(234,179,8,0.03)' : undefined,
                            animationDelay: `${idx * 25}ms`,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <RankBadge pos={s.position} />
                            <Avatar name={s.player?.fullName} player={s.player} rank={s.position} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white text-sm truncate">{s.player?.fullName}</span>
                                {s.position === 1 && <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2.5 mt-1">
                                <span className="text-[11px] font-medium text-green-400">{s.won}P</span>
                                {s.drawn > 0 && <span className="text-[11px] font-medium text-yellow-400">{s.drawn}R</span>}
                                <span className="text-[11px] font-medium text-red-400">{s.lost}G</span>
                                <span className="text-[11px] text-slate-500">{s.played} M</span>
                                <span className="text-[11px] text-slate-600">{s.setsFor}/{s.setsAgainst}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="h-1 w-20 rounded-full overflow-hidden progress-track">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${winRate(s)}%`,
                                      backgroundColor: winRate(s) >= 60 ? '#4ade80' : winRate(s) >= 40 ? '#fb923c' : '#f87171',
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{winRate(s)}%</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-2xl font-black text-orange-400 tabular-nums leading-none">{s.points}</span>
                              <p className="text-[10px] text-slate-500 mt-0.5">bodova</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
                    {[
                      { color: 'text-green-400', label: 'P – Pobeda' },
                      { color: 'text-yellow-400', label: 'R – Remi' },
                      { color: 'text-red-400', label: 'G – Gubitak' },
                      { color: 'text-slate-400', label: 'M – Mečevi' },
                      { color: 'text-slate-500', label: 'L+/L− – Setovi' },
                    ].map(({ color, label }) => (
                      <span key={label} className={`text-[11px] ${color}`}>{label}</span>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ══════════════════ RASPORED ════════════════════════ */}
        {tab === 'raspored' && !isEuroleague && (
          <div className={`animate-fade-in-up space-y-3 ${canEdit && activeSessionForBar && isSessionMode ? 'pb-32 lg:pb-0' : ''}`}>

            {/* ── SESSION MODE ─────────────────────────────────────── */}
            {isSessionMode ? (
              <>
                {fixtures.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="w-10 h-10" />}
                    title="Pool nije generisan"
                    desc="Dodajte igrače i kliknite 'Generiši Raspored' da kreirate pool mečeva."
                    action={canEdit ? (
                      <button onClick={generate} disabled={generating} className="btn-primary">
                        {generating ? 'Generisanje...' : 'Generiši Raspored'}
                      </button>
                    ) : undefined}
                  />
                ) : sessions.length === 0 ? (
                  <div className="card p-8 text-center">
                    <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-white mb-1">Nema sesija</p>
                    <p className="text-xs text-slate-500 mb-4">
                      Pool ima {fixtures.length} mečeva. Odaberi prisutne igrače i kreiraj prvi ligaški dan.
                    </p>
                    {canEdit && (
                      <button onClick={openNewSession} className="btn-primary text-sm mx-auto flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Nova sesija
                      </button>
                    )}
                  </div>
                ) : (() => {
                  const totalInSessions = sessions.reduce((a: number, s: any) => a + (s.matchCount || 0), 0);
                  const completedTotal  = sessions.reduce((a: number, s: any) => a + (s.completedCount || 0), 0);
                  const pendingInPool   = fixtures.filter((m: any) => m.status === 'pending' && !m.sessionId).length;
                  const pct = totalInSessions > 0 ? Math.round((completedTotal / totalInSessions) * 100) : 0;
                  const activeSession   = sessions.find((s: any) => s.status === 'open');
                  const closedSessions  = sessions.filter((s: any) => s.status !== 'open');

                  return (
                    <>
                      {/* ── HEADER / OVERVIEW CARD ─────────────────────────── */}
                      <div className="card p-4">
                        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                              <span className="text-sm font-semibold text-white">Raspored ligaških dana</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              <span className="text-white font-semibold">{completedTotal}</span>
                              <span className="text-slate-500"> / {totalInSessions} odigrano</span>
                              {pendingInPool > 0 && (
                                <span className="text-slate-600 ml-2">· {pendingInPool} u pool-u</span>
                              )}
                            </p>
                          </div>
                          {canEdit && (
                            <button
                              onClick={openNewSession}
                              className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 shrink-0"
                            >
                              <Plus className="w-4 h-4" /> Novi Dan
                            </button>
                          )}
                        </div>
                        {/* Global progress bar */}
                        <div className="h-2 rounded-full overflow-hidden progress-track">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${pct}%`,
                              background: pct === 100
                                ? 'linear-gradient(90deg,#22c55e,#4ade80)'
                                : 'linear-gradient(90deg,#f97316,#fb923c)',
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 flex-wrap gap-1">
                          <div className="flex items-center gap-3">
                            {activeSession && (
                              <span className="flex items-center gap-1.5 text-[11px] text-orange-400">
                                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block animate-pulse" />
                                1 aktivna
                              </span>
                            )}
                            {closedSessions.length > 0 && (
                              <span className="text-[11px] text-slate-500">{closedSessions.length} završenih</span>
                            )}
                            <span className="text-[11px] text-slate-600">· {sessions.length} ukupno</span>
                          </div>
                          <span
                            className="text-[11px] font-bold tabular-nums"
                            style={{ color: pct === 100 ? '#4ade80' : '#fb923c' }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* ── ACTIVE SESSION HERO ────────────────────────────── */}
                      {activeSession && (() => {
                        const sm = fixtures.filter((m: any) => m.sessionId === activeSession.id);
                        const pendingMs = sm.filter((m: any) => m.status !== 'completed');
                        const doneCount = sm.filter((m: any) => m.status === 'completed').length;
                        const sPct = activeSession.matchCount > 0
                          ? Math.round((doneCount / activeSession.matchCount) * 100) : 0;
                        return (
                          <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                              border: '1px solid rgba(249,115,22,0.30)',
                              boxShadow: '0 0 0 1px rgba(249,115,22,0.06), 0 4px 24px rgba(249,115,22,0.07)',
                              backgroundColor: 'var(--bg-card)',
                            }}
                          >
                            {/* Hero header */}
                            <div
                              className="px-4 pt-4 pb-3"
                              style={{
                                background: 'linear-gradient(135deg,rgba(249,115,22,0.07) 0%,transparent 55%)',
                                borderBottom: '1px solid rgba(249,115,22,0.14)',
                              }}
                            >
                              <div className="flex items-start gap-3">
                                {/* Number badge with live ping */}
                                <div className="relative shrink-0 mt-0.5">
                                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                                    <span className="text-base font-bold text-orange-400">{activeSession.sessionNumber}</span>
                                  </div>
                                  <span className="absolute -top-1 -right-1 flex">
                                    <span className="relative w-3 h-3 rounded-full bg-orange-500 border-2 border-[var(--bg-card)]">
                                      <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-70" />
                                    </span>
                                  </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-white leading-tight">
                                      Ligaški Dan {activeSession.sessionNumber}
                                    </h3>
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-orange-500/15 text-orange-400 border border-orange-500/25 rounded-full font-semibold uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                      Aktivan
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                      <Users className="w-3 h-3 text-slate-500 shrink-0" />
                                      {activeSession.presentPlayerIds?.length ?? 0} igrača
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                      <Target className="w-3 h-3 text-slate-500 shrink-0" />
                                      {doneCount}/{activeSession.matchCount} odigrano
                                    </span>
                                    {activeSession.sessionDate && (
                                      <span className="flex items-center gap-1 text-xs text-slate-400">
                                        <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                                        {new Date(activeSession.sessionDate).toLocaleDateString('sr-RS')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteSession(activeSession.id)}
                                    disabled={deletingSession === activeSession.id}
                                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                                    title="Obriši sesiju"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* Session progress bar */}
                              {activeSession.matchCount > 0 && (
                                <div className="mt-3">
                                  <div className="h-1.5 rounded-full overflow-hidden progress-track">
                                    <div
                                      className="h-full bg-orange-500/60 rounded-full transition-all duration-700"
                                      style={{ width: `${sPct}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-slate-500">{pendingMs.length} preostalih</span>
                                    <span className="text-[10px] font-semibold text-orange-400">{sPct}%</span>
                                  </div>
                                </div>
                              )}

                              {/* Action buttons — desktop only; mobile uses sticky bottom bar */}
                              {canEdit && (
                                <div
                                  className="hidden lg:flex items-center gap-2 mt-3 flex-wrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => handleDownloadScoresheet(activeSession, sm)}
                                    disabled={downloadingScoresheet === activeSession.id}
                                    className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-xl transition-all font-medium disabled:opacity-50"
                                  >
                                    {downloadingScoresheet === activeSession.id
                                      ? <span className="animate-spin w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-400 rounded-full inline-block" />
                                      : <Download className="w-3.5 h-3.5" />
                                    }
                                    Raspored
                                  </button>
                                  {doneCount > 0 && (
                                    <button
                                      onClick={() => handleDownloadPDF(activeSession.sessionNumber, sm)}
                                      disabled={downloadingRound === activeSession.sessionNumber}
                                      className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/40 rounded-xl transition-all font-medium disabled:opacity-50"
                                    >
                                      {downloadingRound === activeSession.sessionNumber
                                        ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-300 rounded-full inline-block" />
                                        : <Download className="w-3.5 h-3.5" />
                                      }
                                      Rezultati PDF
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openManualMatch(activeSession)}
                                    className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/40 rounded-xl transition-all font-medium"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Dodaj Meč
                                  </button>
                                  <button
                                    onClick={() => handleCloseSession(activeSession.id)}
                                    disabled={closingSession === activeSession.id}
                                    className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-slate-700/60 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-600/40 hover:border-red-500/25 rounded-xl transition-all font-medium disabled:opacity-50 ml-auto"
                                  >
                                    {closingSession === activeSession.id
                                      ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full inline-block" />
                                      : <Lock className="w-3.5 h-3.5" />
                                    }
                                    Zatvori Sesiju
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Match list — always expanded for active session */}
                            {sm.length > 0 ? (
                              <>
                                {pendingMs.length > 0 && (
                                  <div
                                    className="px-4 py-2 flex items-center gap-2"
                                    style={{ borderBottom: '1px solid rgba(249,115,22,0.08)' }}
                                  >
                                    <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                    <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
                                      Naredni mečevi · {pendingMs.length} preostalih
                                    </span>
                                  </div>
                                )}
                                <div className="divide-y divide-slate-700/30">
                                  {sm.map((m: any, idx: number) => {
                                    const completed = m.status === 'completed';
                                    const homeWon   = completed && m.homeSets > m.awaySets;
                                    const awayWon   = completed && m.awaySets > m.homeSets;
                                    const isDraw    = completed && m.homeSets === m.awaySets;
                                    return (
                                      <div
                                        key={m.id}
                                        className={`flex items-center px-3 sm:px-4 py-3 gap-2 transition-colors ${
                                          completed ? 'opacity-55' : 'hover:bg-orange-500/[0.025]'
                                        }`}
                                      >
                                        <span className="text-[10px] text-slate-700 w-4 shrink-0 tabular-nums text-center">{idx + 1}</span>
                                        <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                                          {homeWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                          <span className={`text-sm font-medium text-right truncate ${
                                            homeWon ? 'text-green-400' : awayWon ? 'text-slate-500' : 'text-white'
                                          }`}>{m.homePlayer?.fullName}</span>
                                        </div>
                                        <div className="w-14 text-center shrink-0">
                                          {completed ? (
                                            <span className={`text-sm font-bold tabular-nums px-1.5 py-0.5 rounded-lg ${
                                              isDraw ? 'text-yellow-400 bg-yellow-500/10' : homeWon ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                                            }`}>{m.homeSets}:{m.awaySets}</span>
                                          ) : (
                                            <span className="text-[11px] text-slate-600 font-bold tracking-wider">vs</span>
                                          )}
                                        </div>
                                        <div className="flex-1 flex items-center gap-1 min-w-0">
                                          {awayWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                          <span className={`text-sm font-medium truncate ${
                                            awayWon ? 'text-green-400' : homeWon ? 'text-slate-500' : 'text-white'
                                          }`}>{m.awayPlayer?.fullName}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {m.isWalkover && completed && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded font-bold">WO</span>
                                          )}
                                          {canEdit && !completed && (
                                            <>
                                              <button
                                                onClick={() => { setEditMatch(m); setMatchScores({ home: 0, away: 0 }); }}
                                                className="text-xs px-3 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg transition-colors font-semibold touch-target"
                                              >
                                                Unesi
                                              </button>
                                              <button
                                                onClick={() => { setWalkoverMatch(m); setWalkoverId(''); }}
                                                className="p-2 text-slate-600 hover:text-red-400 rounded-lg transition-colors touch-target flex items-center justify-center"
                                                title="Valkover"
                                              >
                                                <Ban className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}
                                          {canEdit && completed && !m.isWalkover && (
                                            <button
                                              onClick={() => { setEditMatch(m); setMatchScores({ home: m.homeSets, away: m.awaySets }); }}
                                              className="text-[11px] px-2 py-1 text-slate-600 hover:text-slate-300 rounded-lg transition-colors"
                                            >
                                              Ispravi
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {canEdit && (
                                  <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(249,115,22,0.08)' }}>
                                    <button
                                      onClick={() => openManualMatch(activeSession)}
                                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors font-medium w-full justify-center border border-dashed border-slate-700 hover:border-slate-500"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Dodaj Meč Ručno
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="px-4 py-6 text-center text-xs text-slate-500">
                                Mečevi se učitavaju — klikni "Zatvori" pa ponovo otvori sesiju da ih vidiš.
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── TIMELINE: closed sessions ───────────────────────── */}
                      {closedSessions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest px-1 mb-2 text-slate-500">
                            Prethodne sesije ({closedSessions.length})
                          </p>
                          <div className="card overflow-hidden">
                            {closedSessions.map((session: any, sIdx: number) => {
                              const isExp  = expandedSessions.has(session.id);
                              const sm2    = fixtures.filter((m: any) => m.sessionId === session.id);
                              const done   = session.completedCount ?? sm2.filter((m: any) => m.status === 'completed').length;
                              const total  = session.matchCount ?? sm2.length;
                              const full   = total > 0 && done === total;
                              const rowPct = total > 0 ? (done / total) * 100 : 0;

                              return (
                                <div key={session.id} className={sIdx > 0 ? 'border-t border-slate-700/40' : ''}>
                                  {/* Compact timeline row */}
                                  <div
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none group transition-colors hover:bg-slate-800/25"
                                    onClick={() => toggleExpanded(session.id)}
                                  >
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${full ? 'bg-green-400' : 'bg-slate-500'}`} />
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                      full ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/60 text-slate-400'
                                    }`}>
                                      {session.sessionNumber}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium text-white">Ligaški Dan {session.sessionNumber}</span>
                                      {session.sessionDate && (
                                        <span className="text-[11px] text-slate-500 ml-2">
                                          {new Date(session.sessionDate).toLocaleDateString('sr-RS')}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <span className={`hidden sm:inline text-xs font-medium ${full ? 'text-green-400' : 'text-slate-500'}`}>
                                        {full ? 'Završena' : 'Zatvorena'}
                                      </span>
                                      <span className="text-xs text-slate-500 tabular-nums">{done}/{total}</span>
                                      <div className="w-14 h-1.5 rounded-full overflow-hidden hidden sm:block progress-track">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${full ? 'bg-green-500/60' : 'bg-slate-500/50'}`}
                                          style={{ width: `${rowPct}%` }}
                                        />
                                      </div>
                                      <ChevronDown className={`w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-transform duration-200 ${isExp ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>

                                  {/* Accordion expanded content */}
                                  {isExp && (
                                    <div className="border-t border-slate-700/40 bg-slate-900/20 animate-fade-in">
                                      {/* Actions */}
                                      <div
                                        className="flex items-center gap-1.5 px-4 py-2.5 flex-wrap"
                                        style={{ borderBottom: sm2.length > 0 ? '1px solid rgba(51,65,85,0.4)' : undefined }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          onClick={() => handleDownloadScoresheet(session, sm2)}
                                          disabled={downloadingScoresheet === session.id}
                                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-colors font-medium disabled:opacity-50"
                                        >
                                          {downloadingScoresheet === session.id
                                            ? <span className="animate-spin w-3 h-3 border-2 border-orange-400/30 border-t-orange-400 rounded-full inline-block" />
                                            : <Download className="w-3.5 h-3.5" />
                                          }
                                          Raspored
                                        </button>
                                        {done > 0 && (
                                          <button
                                            onClick={() => handleDownloadPDF(session.sessionNumber, sm2)}
                                            disabled={downloadingRound === session.sessionNumber}
                                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors font-medium disabled:opacity-50"
                                          >
                                            {downloadingRound === session.sessionNumber
                                              ? <span className="animate-spin w-3 h-3 border-2 border-slate-400/30 border-t-slate-300 rounded-full inline-block" />
                                              : <Download className="w-3.5 h-3.5" />
                                            }
                                            Rezultati PDF
                                          </button>
                                        )}
                                        {canEdit && (
                                          <button
                                            onClick={() => handleDeleteSession(session.id)}
                                            disabled={deletingSession === session.id}
                                            className="ml-auto p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                            title="Obriši sesiju"
                                          >
                                            {deletingSession === session.id
                                              ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-600/30 border-t-slate-500 rounded-full inline-block" />
                                              : <Trash2 className="w-3.5 h-3.5" />
                                            }
                                          </button>
                                        )}
                                      </div>
                                      {/* Matches */}
                                      {sm2.length > 0 ? (
                                        <div className="divide-y divide-slate-700/20">
                                          {sm2.map((m: any, idx: number) => {
                                            const completed = m.status === 'completed';
                                            const homeWon   = completed && m.homeSets > m.awaySets;
                                            const awayWon   = completed && m.awaySets > m.homeSets;
                                            const isDraw    = completed && m.homeSets === m.awaySets;
                                            return (
                                              <div key={m.id} className="flex items-center px-4 py-2.5 gap-2 hover:bg-slate-800/20 transition-colors">
                                                <span className="text-[10px] text-slate-700 w-4 shrink-0 tabular-nums text-center">{idx + 1}</span>
                                                <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                                                  {homeWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                                  <span className={`text-sm font-medium text-right truncate ${
                                                    homeWon ? 'text-green-400' : awayWon ? 'text-slate-500' : 'text-slate-200'
                                                  }`}>{m.homePlayer?.fullName}</span>
                                                </div>
                                                <div className="w-14 text-center shrink-0">
                                                  {completed ? (
                                                    <span className={`text-sm font-bold tabular-nums px-1.5 py-0.5 rounded ${
                                                      isDraw ? 'text-yellow-400' : homeWon ? 'text-green-400' : 'text-red-400'
                                                    }`}>{m.homeSets}:{m.awaySets}</span>
                                                  ) : (
                                                    <span className="text-xs text-slate-600 font-medium">vs</span>
                                                  )}
                                                </div>
                                                <div className="flex-1 flex items-center gap-1 min-w-0">
                                                  {awayWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                                  <span className={`text-sm font-medium truncate ${
                                                    awayWon ? 'text-green-400' : homeWon ? 'text-slate-500' : 'text-slate-200'
                                                  }`}>{m.awayPlayer?.fullName}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  {m.isWalkover && completed && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded font-bold">WO</span>
                                                  )}
                                                  {canEdit && completed && !m.isWalkover && (
                                                    <button
                                                      onClick={() => { setEditMatch(m); setMatchScores({ home: m.homeSets, away: m.awaySets }); }}
                                                      className="text-[11px] px-2 py-1 text-slate-600 hover:text-slate-300 rounded-lg transition-colors"
                                                    >
                                                      Ispravi
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="px-4 py-4 text-center text-xs text-slate-500">Nema mečeva za ovu sesiju.</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              /* ── LEGACY round display (old data) ─────────────────── */
              Object.keys(byEvening).length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-10 h-10" />}
                  title="Raspored nije generisan"
                  desc="Dodajte igrače, zatim generišite raspored."
                  action={canEdit ? (
                    <button onClick={generate} disabled={generating} className="btn-primary">
                      {generating ? 'Generisanje...' : 'Generiši Raspored'}
                    </button>
                  ) : undefined}
                />
              ) : (
                Object.entries(byEvening)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([evening, matches]) => {
                    const completedCount = matches.filter((m: any) => m.status === 'completed').length;
                    const allDone = completedCount === matches.length;
                    return (
                      <div key={evening} className="card overflow-hidden">
                        <div className={`px-4 py-3 border-b border-slate-700/60 ${allDone ? 'bg-green-500/5' : 'bg-slate-800/40'}`}>
                          {/* Title row */}
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${allDone ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-white'}`}>
                              {evening}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-white">Ligaški Dan {evening}</p>
                                {allDone && <span className="text-xs text-green-400 font-medium flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Završeno</span>}
                              </div>
                              <span className="text-xs text-slate-500">{completedCount}/{matches.length} odigrano</span>
                            </div>
                          </div>
                          {/* Action buttons row */}
                          {(completedCount > 0 || (canEdit && !allDone)) && (
                            <div className="flex items-center gap-1.5 mt-2.5">
                              {completedCount > 0 && (
                                <button
                                  onClick={() => handleDownloadPDF(Number(evening), matches)}
                                  disabled={downloadingRound === Number(evening)}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors font-medium disabled:opacity-50">
                                  {downloadingRound === Number(evening)
                                    ? <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-300 rounded-full" />
                                    : <Download className="w-3.5 h-3.5" />
                                  }
                                  Rezultati PDF
                                </button>
                              )}
                              {canEdit && !allDone && (
                                <button
                                  onClick={() => openSubstitute(Number(evening))}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors font-medium"
                                  title="Zameni igrača">
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  Zamena
                                </button>
                              )}
                            </div>
                          )}
                          <div className="mt-2.5 h-1 rounded-full overflow-hidden progress-track">
                            <div className="h-full bg-green-500/70 rounded-full transition-all duration-500" style={{ width: `${(completedCount / matches.length) * 100}%` }} />
                          </div>
                          {/* Substitution summary for this evening */}
                          {substitutions.filter((s: any) => s.appliedFromEvening === Number(evening)).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-700/40">
                              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Zamene:</p>
                              {substitutions
                                .filter((s: any) => s.appliedFromEvening === Number(evening))
                                .map((s: any) => (
                                  <div key={s.id} className="flex items-center gap-1.5 text-[11px]">
                                    <span className="text-slate-500 line-through">{s.absentPlayer?.fullName}</span>
                                    <span className="text-slate-600">→</span>
                                    <span className="text-amber-400 font-medium">{s.substitutePlayer?.fullName}</span>
                                    <span className="text-[10px]">🔁</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        <div className="divide-y divide-slate-700/30">
                          {matches.map((m: any, idx: number) => {
                            const completed = m.status === 'completed';
                            const homeWon = completed && m.homeSets > m.awaySets;
                            const awayWon = completed && m.awaySets > m.homeSets;
                            const isDraw  = completed && m.homeSets === m.awaySets;
                            const isPostponed = !completed && m.isPostponed;

                            // Determine substitution info from both match fields and history
                            const eveningNum = Number(evening);
                            const homeSub = substitutions.find(
                              (s: any) => s.substitutePlayerId === m.homePlayerId && s.appliedFromEvening === eveningNum
                            );
                            const awaySub = substitutions.find(
                              (s: any) => s.substitutePlayerId === m.awayPlayerId && s.appliedFromEvening === eveningNum
                            );
                            const homeOriginalName = m.homeSubstituteFor?.fullName || homeSub?.absentPlayer?.fullName;
                            const awayOriginalName = m.awaySubstituteFor?.fullName || awaySub?.absentPlayer?.fullName;
                            const hasSubstitution = !!(homeOriginalName || awayOriginalName);

                            return (
                              <div key={m.id} className={`flex items-center px-3 sm:px-4 py-3 gap-2 hover:bg-slate-800/30 transition-colors ${completed && !homeWon && !awayWon ? 'result-draw' : ''} ${hasSubstitution ? 'border-l-2 border-amber-500/60 bg-amber-500/[0.04]' : ''} ${isPostponed ? 'border-l-2 border-orange-500/70 bg-orange-500/[0.06] opacity-75' : ''}`}>
                                <span className="text-[10px] text-slate-700 w-4 shrink-0 tabular-nums text-center">{idx + 1}</span>
                                {/* Home player */}
                                <div className="flex-1 flex flex-col items-end min-w-0">
                                  {homeOriginalName && (
                                    <span className="text-[10px] text-slate-600 line-through leading-none mb-0.5 truncate max-w-full">
                                      {homeOriginalName}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 justify-end min-w-0">
                                    {homeWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                    {homeOriginalName && <ArrowLeftRight className="w-3 h-3 text-amber-500 shrink-0" />}
                                    <span className={`text-sm font-medium truncate ${
                                      homeWon ? 'text-green-400' : awayWon ? 'text-slate-500' : homeOriginalName ? 'text-amber-400 font-semibold' : 'text-white'
                                    }`}>{m.homePlayer?.fullName}</span>
                                  </div>
                                </div>
                                {/* Score */}
                                <div className="w-12 text-center shrink-0">
                                  {completed
                                    ? <span className={`text-sm font-bold tabular-nums px-1.5 py-0.5 rounded ${isDraw ? 'text-yellow-400' : homeWon ? 'text-green-400' : 'text-red-400'}`}>{m.homeSets}:{m.awaySets}</span>
                                    : isPostponed
                                    ? <span className="text-[10px] text-orange-400 font-bold leading-tight">ODL.</span>
                                    : <span className="text-xs text-slate-600 font-medium">vs</span>
                                  }
                                </div>
                                {/* Away player */}
                                <div className="flex-1 flex flex-col items-start min-w-0">
                                  {awayOriginalName && (
                                    <span className="text-[10px] text-slate-600 line-through leading-none mb-0.5 truncate max-w-full">
                                      {awayOriginalName}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 min-w-0">
                                    {awayWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                    <span className={`text-sm font-medium truncate ${
                                      awayWon ? 'text-green-400' : homeWon ? 'text-slate-500' : awayOriginalName ? 'text-amber-400 font-semibold' : 'text-white'
                                    }`}>{m.awayPlayer?.fullName}</span>
                                    {awayOriginalName && <ArrowLeftRight className="w-3 h-3 text-amber-500 shrink-0" />}
                                  </div>
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {isPostponed && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/15 text-orange-400 rounded font-bold hidden sm:inline">Odloženo</span>
                                  )}
                                  {m.isWalkover && completed && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded font-bold">WO</span>}
                                  {canEdit && !completed && !isPostponed && (
                                    <>
                                      <button onClick={() => { setEditMatch(m); setMatchScores({ home: 0, away: 0 }); }} className="text-xs px-2.5 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg transition-colors font-medium touch-target">Unesi</button>
                                      <button onClick={() => { setWalkoverMatch(m); setWalkoverId(''); }} className="p-2 text-slate-600 hover:text-red-400 rounded-lg transition-colors touch-target flex items-center justify-center" title="Valkover"><Ban className="w-3.5 h-3.5" /></button>
                                    </>
                                  )}
                                  {canEdit && completed && !m.isWalkover && (
                                    <button onClick={() => { setEditMatch(m); setMatchScores({ home: m.homeSets, away: m.awaySets }); }} className="text-[11px] px-2 py-1 text-slate-600 hover:text-slate-300 rounded-lg transition-colors">Ispravi</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              )
            )}

            {/* ── Odloženi mečevi ───────────────────────────────── */}
            {!isSessionMode && (() => {
              const postponed = fixtures.filter((m: any) => m.isPostponed && m.status !== 'completed');
              if (postponed.length === 0) return null;
              return (
                <div className="card overflow-hidden border border-orange-500/20">
                  <div className="px-4 py-3 border-b border-orange-500/20 bg-orange-500/5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                      <p className="text-sm font-semibold text-orange-300">Odloženi mečevi ({postponed.length})</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 ml-6">Ovi mečevi moraju biti odigrani — unesite rezultate kada se odigraju.</p>
                  </div>
                  <div className="divide-y divide-slate-700/30">
                    {postponed.map((m: any) => (
                      <div key={m.id} className="flex items-center px-4 py-3 gap-3 hover:bg-slate-800/30 transition-colors">
                        {/* Home */}
                        <div className="flex-1 text-right">
                          <span className="text-sm font-medium text-white">{m.homePlayer?.fullName}</span>
                        </div>
                        {/* Middle */}
                        <div className="text-center shrink-0 flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-orange-400 font-bold">ODL.</span>
                          <span className="text-xs text-slate-600">Dan {m.sessionNumber}</span>
                        </div>
                        {/* Away */}
                        <div className="flex-1">
                          <span className="text-sm font-medium text-white">{m.awayPlayer?.fullName}</span>
                        </div>
                        {/* Actions */}
                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditMatch(m); setMatchScores({ home: 0, away: 0 }); }}
                              className="text-xs px-2.5 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg transition-colors font-medium touch-target"
                            >
                              Unesi
                            </button>
                            <button
                              onClick={() => { setWalkoverMatch(m); setWalkoverId(''); }}
                              className="p-2 text-slate-600 hover:text-red-400 rounded-lg transition-colors touch-target flex items-center justify-center"
                              title="Valkover"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Legend */}
            {!isSessionMode && fixtures.length > 0 && (
              <div className="flex flex-wrap gap-3 px-1 pt-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/20 inline-block"></span>Meč sa zamenom</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/20 inline-block"></span>Odložen meč</span>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ ODLOŽENI ════════════════════════ */}
        {tab === 'odlozeni' && !isEuroleague && (
          <div className="animate-fade-in-up space-y-4">

            {/* Postponed matches */}
            {postponedMatches.length === 0 ? (
              <div className="card p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-white mb-1">Nema odloženih mečeva</p>
                <p className="text-xs text-slate-500">Svi mečevi su odigrani ili još nisu odloženi.</p>
              </div>
            ) : (
              <div className="card overflow-hidden border border-orange-500/20">
                <div className="px-4 py-3 border-b border-orange-500/20 bg-orange-500/5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                    <p className="text-sm font-semibold text-orange-300">Odloženi mečevi ({postponedMatches.length})</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 ml-6">Unesite rezultate kada se ovi mečevi odigraju — utiču na tabelu.</p>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {postponedMatches.map((m: any) => (
                    <div key={m.id} className="flex items-center px-4 py-3 gap-3 hover:bg-slate-800/30 transition-colors">
                      {/* Home */}
                      <div className="flex-1 text-right">
                        <span className="text-sm font-medium text-white">{m.homePlayer?.fullName}</span>
                      </div>
                      {/* Middle */}
                      <div className="text-center shrink-0 flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-orange-400 font-bold">ODL.</span>
                        <span className="text-xs text-slate-600">Dan {m.sessionNumber}</span>
                      </div>
                      {/* Away */}
                      <div className="flex-1">
                        <span className="text-sm font-medium text-white">{m.awayPlayer?.fullName}</span>
                      </div>
                      {/* Actions */}
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditMatch(m); setMatchScores({ home: 0, away: 0 }); }}
                            className="text-xs px-2.5 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg transition-colors font-medium touch-target"
                          >
                            Unesi
                          </button>
                          <button
                            onClick={() => { setWalkoverMatch(m); setWalkoverId(''); }}
                            className="p-2 text-slate-600 hover:text-red-400 rounded-lg transition-colors touch-target flex items-center justify-center"
                            title="Valkover"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Substitution history */}
            {substitutions.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-amber-400" /> Istorija zamena
                  </h3>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {Object.entries(
                    substitutions.reduce((acc: Record<number, any[]>, s: any) => {
                      const ev = s.appliedFromEvening;
                      if (!acc[ev]) acc[ev] = [];
                      acc[ev].push(s);
                      return acc;
                    }, {})
                  )
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([evening, subs]) => (
                      <div key={evening} className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-400 mb-2">Ligaški Dan {evening}</p>
                        <div className="space-y-1.5">
                          {(subs as any[]).map((s: any) => (
                            <div key={s.id} className="flex items-center gap-2 text-sm">
                              <span className="text-slate-400 line-through text-xs">{s.absentPlayer?.fullName}</span>
                              <ArrowLeftRight className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="text-amber-400 font-medium text-xs">{s.substitutePlayer?.fullName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {substitutions.length === 0 && postponedMatches.length === 0 && null}
          </div>
        )}

        {/* ══════════════════ IGRAČI — DIRECTORY ══════════════════ */}
        {tab === 'igraci' && (() => {
          // ── helpers ─────────────────────────────────────────────
          const getForm = (playerId: string): ('W' | 'L' | 'D')[] => {
            const done = fixtures
              .filter((m: any) => m.status === 'completed' && (m.homePlayerId === playerId || m.awayPlayerId === playerId))
              .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
              .slice(0, 5);
            return done.map((m: any) => {
              const isHome = m.homePlayerId === playerId;
              const hs = m.homeSets ?? 0; const as_ = m.awaySets ?? 0;
              if (hs === as_) return 'D';
              return (isHome ? hs > as_ : as_ > hs) ? 'W' : 'L';
            });
          };
          const formDot = (r: 'W' | 'L' | 'D') =>
            r === 'W' ? 'bg-green-500' : r === 'L' ? 'bg-red-500' : 'bg-slate-500';

          // parsed preview
          const parsedNames = bulkText.trim()
            ? bulkText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
            : [];
          const registeredNames = new Set(lPlayers.map((lp: any) => lp.player?.fullName?.toLowerCase()));
          const duplicateNames  = new Set(parsedNames.filter((n) => registeredNames.has(n.toLowerCase())));

          // filtered + sorted
          const filteredPlayers = lPlayers
            .filter((lp: any) => lp.player?.fullName?.toLowerCase().includes(playerSearch.toLowerCase()))
            .sort((a: any, b: any) => {
              if (playerSort === 'name') return (a.player?.fullName ?? '').localeCompare(b.player?.fullName ?? '');
              const sa = standings.find((s: any) => s.player?.id === a.playerId);
              const sb = standings.find((s: any) => s.player?.id === b.playerId);
              return (sb?.points ?? 0) - (sa?.points ?? 0);
            });

          return (
            <div className="animate-fade-in-up space-y-3">

              {/* ── HEADER ROW ──────────────────────────────────── */}
              <div className="flex items-center gap-2.5">
                {/* Title + count */}
                <div className="flex items-center gap-2 shrink-0">
                  <h3 className="font-bold text-white text-base">Igrači</h3>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded-full tabular-nums">{lPlayers.length}</span>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 input-field px-2.5 py-2 flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-orange-400/60 shrink-0" />
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Pretraži..."
                    className="flex-1 bg-transparent text-sm outline-none text-white placeholder-slate-500 min-w-0"
                  />
                  {playerSearch && (
                    <button onClick={() => setPlayerSearch('')} className="text-slate-500 hover:text-white transition-colors shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Add toggle */}
                {canEdit && (
                  <button
                    onClick={() => setAddPanelOpen(!addPanelOpen)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium transition-all shrink-0 active:scale-95 ${addPanelOpen ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'btn-primary'}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Dodaj</span>
                    {addPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* ── COLLAPSIBLE ADD PANEL ───────────────────────── */}
              {canEdit && addPanelOpen && (
                <div className="card p-4 space-y-3.5 animate-slide-up">
                  <textarea
                    ref={bulkRef}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleBulkAdd(); }}
                    placeholder={'Unesi imena (jedno po redu ili razdvojeno zarezom)\n\nMarko Petrović\nNikola Jovanović, Stefan Ilić'}
                    rows={3}
                    autoFocus
                    className="input-field resize-none text-sm leading-relaxed"
                  />

                  {/* Name preview pills */}
                  {parsedNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {parsedNames.map((name, i) => {
                        const isDup = duplicateNames.has(name.toLowerCase());
                        return (
                          <span key={i} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                            isDup ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
                          }`}>
                            {isDup && <span className="text-[10px]">⚠</span>}
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {parsedNames.length > 0 && duplicateNames.size > 0 && (
                    <p className="text-[11px] text-amber-400/70 -mt-1">{duplicateNames.size} igrač(a) već dodat — biće preskočen(o)</p>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {parsedNames.length > 0 ? `${parsedNames.length} ime(na) · Ctrl+Enter` : 'Ctrl+Enter za brzo dodavanje'}
                    </span>
                    <button onClick={handleBulkAdd} disabled={!bulkText.trim() || bulkAdding} className="btn-primary text-sm py-2 w-full sm:w-auto disabled:opacity-50">
                      {bulkAdding
                        ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full mr-1.5" />Dodavanje...</>
                        : <><Plus className="w-4 h-4" />Dodaj igrače</>
                      }
                    </button>
                  </div>

                  {bulkFeedback && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl animate-fade-in-up">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-xs text-green-300 font-medium">
                        {bulkFeedback.added > 0 && `${bulkFeedback.added} dodato`}
                        {bulkFeedback.created > 0 && ` · ${bulkFeedback.created} kreiran(o)`}
                        {bulkFeedback.skipped > 0 && ` · ${bulkFeedback.skipped} preskočen(o)`}
                      </span>
                    </div>
                  )}

                  {availablePlayers.length > 0 && (
                    <div className="border-t border-slate-700/50 pt-3">
                      <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">Postojeći igrači kluba</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availablePlayers.map((p: any) => (
                          <button key={p.id} onClick={() => addPlayer(p.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-slate-700 hover:bg-orange-500/20 hover:text-orange-300 text-slate-300 rounded-lg transition-all active:scale-95">
                            <Plus className="w-3 h-3" />{p.fullName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SORT / BULK BAR ─────────────────────────────── */}
              {canEdit && selectedPlayerIds.size > 0 ? (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 card bg-orange-500/[0.06] border border-orange-500/20 animate-fade-in">
                  <span className="text-xs font-medium text-orange-300">{selectedPlayerIds.size} igrač(a) izabrano</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedPlayerIds(new Set())} className="text-xs px-2.5 py-1.5 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                      Poništi
                    </button>
                    <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg transition-colors font-medium disabled:opacity-50">
                      {bulkDeleting
                        ? <span className="animate-spin inline-block w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                      Ukloni iz lige
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5 w-fit">
                  {(['points', 'name'] as const).map((s) => (
                    <button key={s} onClick={() => setPlayerSort(s)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${playerSort === s ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                      {s === 'points' ? 'Bodovi' : 'Ime A–Ž'}
                    </button>
                  ))}
                </div>
              )}

              {/* ── PLAYER GRID ─────────────────────────────────── */}
              {lPlayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-white font-medium mb-1.5">Nema igrača</p>
                  <p className="text-sm text-slate-500 mb-4">Dodajte igrače koristeći dugme "Dodaj" iznad.</p>
                  {canEdit && (
                    <button onClick={() => setAddPanelOpen(true)} className="btn-primary text-sm py-2 px-5">
                      <Plus className="w-4 h-4" />Dodaj igrače
                    </button>
                  )}
                </div>
              ) : filteredPlayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-6 h-6 text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">Nema rezultata za "{playerSearch}"</p>
                  <button onClick={() => setPlayerSearch('')} className="text-xs text-orange-400 hover:text-orange-300 mt-1.5 transition-colors">Poništi pretragu</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredPlayers.map((lp: any, idx: number) => {
                    const standing   = standings.find((s: any) => s.player?.id === lp.playerId);
                    const isSelected = selectedPlayerIds.has(lp.playerId);
                    const form       = getForm(lp.playerId);

                    return (
                      <div
                        key={lp.id}
                        style={{ animationDelay: `${idx * 30}ms` }}
                        className={`relative card p-4 flex flex-col items-center text-center gap-2.5 cursor-pointer transition-all duration-150 group select-none
                          ${isSelected
                            ? 'ring-2 ring-orange-500 bg-orange-500/[0.06] shadow-lg shadow-orange-500/10'
                            : 'hover:bg-slate-800/60 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'}
                        `}
                        onClick={canEdit ? () => toggleSelectPlayer(lp.playerId) : () => setSelectedPlayer(lp)}
                      >
                        {/* Checkbox corner */}
                        {canEdit && (
                          <div className={`absolute top-2.5 left-2.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-150
                            ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-600 opacity-0 group-hover:opacity-100'}
                          `}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        )}

                        {/* Pixel avatar */}
                        <Avatar name={lp.player?.fullName} player={lp.player} size="lg" />

                        {/* Name + simple stats */}
                        <div className="w-full min-w-0">
                          <p className="text-sm font-semibold text-white leading-tight truncate">{lp.player?.fullName}</p>
                          {standing ? (
                            <p className="text-xs text-slate-400 mt-1">
                              <span className="text-orange-400 font-bold">{standing.points}</span> bod.
                              <span className="mx-1.5 text-slate-600">·</span>
                              {standing.played} meč.
                            </p>
                          ) : (
                            <p className="text-xs text-slate-600 mt-1">Bez mečeva</p>
                          )}
                        </div>

                        {/* Form dots */}
                        <div className="flex items-center justify-center gap-1">
                          {form.length > 0
                            ? form.map((r, i) => (
                                <span key={i} title={r === 'W' ? 'Pobeda' : r === 'L' ? 'Poraz' : 'Remi'}
                                  className={`w-2 h-2 rounded-full ${formDot(r)}`}
                                />
                              ))
                            : Array.from({ length: 5 }, (_, i) => (
                                <span key={i} className="w-2 h-2 rounded-full bg-slate-700" />
                              ))
                          }
                        </div>

                        {/* Detalji CTA */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPlayer(lp); }}
                          className="w-full text-xs text-slate-400 hover:text-orange-400 font-medium py-1.5 rounded-lg hover:bg-orange-500/10 transition-all"
                        >
                          Detalji →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })()}
      </div>

      {/* ══ MODAL: Ručno dodavanje meča ══════════════════════════ */}
      {manualMatchSession && (
        <Modal onClose={closeManualMatch}>
          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-orange-400" />
              {manualBuildMode
                ? <>Ligaški Dan {manualMatchSession.sessionNumber} — Manuelni unos</>
                : <>Dodaj Meč — Ligaški Dan {manualMatchSession.sessionNumber}</>
              }
            </h3>
            <button onClick={closeManualMatch} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="space-y-4 overflow-y-auto overscroll-contain" style={{ maxHeight: 'min(60vh, 500px)' }}>

            {/* Player selectors */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Domaćin</label>
              <PlayerCombobox
                value={manualHome}
                onChange={(pid) => { setManualHome(pid); setManualCheck(null); }}
                players={lPlayers}
                excludeId={manualAway}
                placeholder="— Pretraži domaćina —"
              />
            </div>

            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <div className="h-px w-12 bg-slate-700" />
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <div className="h-px w-12 bg-slate-700" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Gost</label>
              <PlayerCombobox
                value={manualAway}
                onChange={(pid) => { setManualAway(pid); setManualCheck(null); }}
                players={lPlayers}
                excludeId={manualHome}
                placeholder="— Pretraži gosta —"
              />
            </div>

            {/* Validation feedback */}
            {(manualChecking || manualCheck) && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-3 animate-fade-in ${
                manualChecking ? 'bg-slate-800 border border-slate-700' :
                manualCheck?.status === 'blocked' ? 'bg-red-500/10 border border-red-500/30' :
                manualCheck?.status === 'error'   ? 'bg-red-500/10 border border-red-500/30' :
                manualCheck?.status === 'second'  ? 'bg-amber-500/10 border border-amber-500/30' :
                                                    'bg-green-500/10 border border-green-500/30'
              }`}>
                {manualChecking ? (
                  <span className="animate-spin w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full shrink-0 mt-0.5" />
                ) : manualCheck?.status === 'blocked' || manualCheck?.status === 'error' ? (
                  <span className="text-red-400 text-base shrink-0">❌</span>
                ) : manualCheck?.status === 'second' ? (
                  <span className="text-amber-400 text-base shrink-0">⚠️</span>
                ) : (
                  <span className="text-green-400 text-base shrink-0">✅</span>
                )}
                <div>
                  {manualChecking && <p className="text-slate-400">Provera...</p>}
                  {!manualChecking && manualCheck?.status === 'blocked' && (
                    <>
                      <p className="font-semibold text-red-400">Nije moguće dodati meč</p>
                      <p className="text-xs text-red-400/70 mt-0.5">Ovi igrači su već odigrali oba predviđena meča u ligi.</p>
                    </>
                  )}
                  {!manualChecking && manualCheck?.status === 'error' && (
                    <>
                      <p className="font-semibold text-red-400">Greška pri proveri</p>
                      <p className="text-xs text-red-400/70 mt-0.5">{manualCheck.message}</p>
                    </>
                  )}
                  {!manualChecking && manualCheck?.status === 'second' && (() => {
                    const actualHome = lPlayers.find((lp: any) => lp.playerId === manualCheck.actualHomeId)?.player?.fullName;
                    const actualAway = lPlayers.find((lp: any) => lp.playerId === manualCheck.actualAwayId)?.player?.fullName;
                    return (
                      <>
                        <p className="font-semibold text-amber-400">Validan meč — drugi (poslednji) susret</p>
                        {manualCheck.willReverse && actualHome && actualAway && (
                          <p className="text-xs text-amber-400 mt-1 font-medium">
                            ↔ Smer je automatski preokrenut: <span className="text-white">{actualHome}</span> (dom.) vs <span className="text-white">{actualAway}</span> (gost)
                          </p>
                        )}
                        <p className="text-xs text-amber-400/70 mt-0.5">
                          Nakon ovog meča {manualCheck.isFromPool ? '(iz pool-a)' : ''}, ovi igrači više neće moći igrati jedan protiv drugog.
                        </p>
                      </>
                    );
                  })()}
                  {!manualChecking && manualCheck?.status === 'first' && (
                    <>
                      <p className="font-semibold text-green-400">Validan meč — prvi susret</p>
                      <p className="text-xs text-green-400/70 mt-0.5">
                        {manualCheck.isFromPool ? 'Meč postoji u pool-u i biće dodeljen ovoj sesiji.' : 'Novi meč će biti kreiran.'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Build mode: running list of added matches */}
            {manualBuildMode && manualAddedMatches.length > 0 && (
              <div className="rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-slate-800/60 border-b border-slate-700">
                  <p className="text-xs text-slate-400 font-medium">
                    Uneti mečevi — <span className="text-white font-semibold">{manualAddedMatches.length}</span>
                  </p>
                </div>
                <div className="divide-y divide-slate-700/50 max-h-48 overflow-y-auto">
                  {manualAddedMatches.map((m, i) => (
                    <div key={m?.id ?? i} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <span className="text-slate-600 tabular-nums w-5 shrink-0">{i + 1}.</span>
                      <span className="text-slate-200 flex-1 truncate">{m?.homePlayer?.fullName ?? '—'}</span>
                      <span className="text-slate-600 shrink-0">vs</span>
                      <span className="text-slate-200 flex-1 truncate text-right">{m?.awayPlayer?.fullName ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ── Footer ── */}
          <div className="flex gap-3 pt-4 mt-1 border-t border-slate-700/40 shrink-0">
            {manualBuildMode ? (
              <button
                onClick={async () => { closeManualMatch(); await load(); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors"
              >
                Završi ({manualAddedMatches.length} meč{manualAddedMatches.length !== 1 ? 'a' : ''})
              </button>
            ) : (
              <button
                onClick={closeManualMatch}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Otkaži
              </button>
            )}
            <button
              onClick={handleAddManualMatch}
              disabled={
                !manualHome || !manualAway || manualHome === manualAway ||
                !manualCheck || manualCheck.status === 'blocked' || manualCheck.status === 'error' ||
                manualChecking || manualSaving
              }
              className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {manualSaving
                ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full mr-1.5" />Dodavanje...</>
                : <><Plus className="w-4 h-4 mr-1" />Dodaj Meč</>
              }
            </button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: QR kod (share link) ═══════════════════════════ */}
      {showQr && (
        <ShareModal
          leagueId={league?.id}
          shareToken={shareToken}
          shareLoading={shareLoading}
          setShareToken={setShareToken}
          setShareLoading={setShareLoading}
          copied={copied}
          setCopied={setCopied}
          onClose={() => setShowQr(false)}
        />
      )}

      {/* ══ MODAL: Nova sesija ═══════════════════════════════════ */}
      {newSessionOpen && (
        <Modal onClose={() => { setNewSessionOpen(false); setSessionPreview(null); }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-orange-400" /> Novi Ligaški Dan
            </h3>
            <button onClick={() => { setNewSessionOpen(false); setSessionPreview(null); }} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 mb-4 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
            <button
              onClick={() => { setSessionManualMode(false); setSessionPreview(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                !sessionManualMode ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => { setSessionManualMode(true); setSessionPreview(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                sessionManualMode ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Manuelno
            </button>
          </div>

          {/* Date */}
          <div className="mb-4">
            <label className="text-xs text-slate-400 mb-1.5 block">Datum ligaškog dana (opciono)</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>

          {/* ── Auto mode only ── */}
          {!sessionManualMode && (
            <>
              {/* Max per player */}
              <div className="mb-4">
                <label className="text-xs text-slate-400 mb-2 block">Maks. mečeva po igraču</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setSessionMaxPer(n); setSessionPreview(null); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                        sessionMaxPer === n
                          ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >{n}</button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={![1,2,3,4,5,6].includes(sessionMaxPer) ? sessionMaxPer : ''}
                    placeholder="..."
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (v >= 1) { setSessionMaxPer(v); setSessionPreview(null); }
                    }}
                    className="w-14 py-2 px-2 rounded-lg text-sm font-semibold border-2 border-slate-700 bg-slate-800 text-slate-300 text-center focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Player selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-400">Prisutni igrači ({sessionPresent.size}/{sessionModalPlayers.length})</label>
                  <div className="flex gap-2">
                    <button onClick={() => { setSessionPresent(new Set(sessionModalPlayers.map((lp: any) => lp.playerId))); setSessionPreview(null); }} className="text-xs text-slate-400 hover:text-white">Svi</button>
                    <span className="text-slate-700">·</span>
                    <button onClick={() => { setSessionPresent(new Set()); setSessionPreview(null); }} className="text-xs text-slate-400 hover:text-white">Nijedan</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                  {sessionModalPlayers.map((lp: any) => {
                    const present = sessionPresent.has(lp.playerId);
                    return (
                      <label
                        key={lp.playerId}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                          present ? 'border-orange-500/50 bg-orange-500/8' : 'border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={present}
                          onChange={() => togglePresent(lp.playerId)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          present ? 'border-orange-500 bg-orange-500' : 'border-slate-600'
                        }`}>
                          {present && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <Avatar name={lp.player?.fullName} player={lp.player} size="sm" />
                        <span className="text-sm text-white font-medium flex-1">{lp.player?.fullName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Live match count calculation */}
              {sessionPresent.size >= 2 && (() => {
                const N = sessionPresent.size;
                const M = sessionMaxPer;
                const estimate = (N * M) / 2;
                const isValid = (N * M) % 2 === 0;
                const realCount = sessionPreview?.matchCount;
                const displayCount = realCount ?? estimate;
                const isEstimate = realCount === undefined;
                return (
                  <div className={`mb-4 px-3.5 py-3 rounded-xl border transition-all ${
                    isValid
                      ? 'bg-orange-500/8 border-orange-500/25'
                      : 'bg-red-500/8 border-red-500/25'
                  }`}>
                    {isValid ? (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {isEstimate ? '~' : ''}{displayCount} meč{displayCount !== 1 ? 'a' : ''} večeras
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {N} igrač{N !== 1 ? 'a' : ''} · svako igra {M} meč{M !== 1 ? 'a' : ''}
                            {isEstimate && <span className="ml-1 opacity-60">(procena)</span>}
                          </p>
                        </div>
                        <div className="text-2xl font-bold text-orange-400 tabular-nums shrink-0">
                          {isEstimate ? '~' : ''}{displayCount}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                          <span className="text-red-400 text-xs font-bold">!</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-400">Neparni raspored</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {N} × {M} = {N * M} nije deljivo sa 2 — nije moguće ravnomerno rasporediti
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Preview */}
              <button
                onClick={loadPreview}
                disabled={sessionPresent.size < 2 || previewLoading}
                className="w-full py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 text-sm font-medium transition-colors mb-3 disabled:opacity-40"
              >
                {previewLoading
                  ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-slate-400/30 border-t-slate-300 rounded-full mr-2" />Računam...</>
                  : 'Prikaži pregled mečeva'
                }
              </button>

              {sessionPreview && (
                <div className="mb-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">
                    <span className="text-white font-semibold">{sessionPreview.matchCount}</span> mečeva biće generisano
                    &nbsp;·&nbsp;{sessionPreview.presentCount} prisutnih igrača
                    &nbsp;·&nbsp;Pool: {sessionPreview.poolSize} preostalo
                  </p>
                  {sessionPreview.matches?.slice(0, 5).map((m: any, i: number) => (
                    <div key={m?.id ?? i} className="flex items-center justify-between text-xs py-1 border-t border-slate-700/50">
                      <span className="text-slate-300">{m?.homePlayer?.fullName}</span>
                      <span className="text-slate-600 px-2">vs</span>
                      <span className="text-slate-300">{m?.awayPlayer?.fullName}</span>
                    </div>
                  ))}
                  {sessionPreview.matchCount > 5 && (
                    <p className="text-xs text-slate-500 text-center mt-1">+{sessionPreview.matchCount - 5} još</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Manual mode info ── */}
          {sessionManualMode && (
            <div className="mb-4 px-3.5 py-3 rounded-xl border border-slate-700 bg-slate-800/40">
              <p className="text-sm font-medium text-white mb-1">Manuelni unos mečeva</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Kreiraće se prazna sesija. Nakon toga možeš dodavati mečeve jedan po jedan — biraš domaćina i gosta za svaki meč.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreateSession}
              disabled={creatingSession || (!sessionManualMode && sessionPresent.size < 2)}
              className="btn-primary flex-1 justify-center text-sm disabled:opacity-40"
            >
              {creatingSession
                ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full mr-1.5" />Kreiranje...</>
                : <><UserCheck className="w-4 h-4" />Kreiraj sesiju</>
              }
            </button>
            <button onClick={() => { setNewSessionOpen(false); setSessionPreview(null); }} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Zamena Igrača (round mode) ══════════════════ */}
      {subEvening !== null && (() => {
        // Only pending (unplayed) matches determine who is "scheduled" this evening
        const eveningPendingMatches = (byEvening[subEvening] || []).filter(
          (m: any) => m.status === 'pending' && !m.isPostponed,
        );
        const eveningPlayerMap = new Map<string, string>(
          eveningPendingMatches.flatMap((m: any) => [
            [m.homePlayerId, m.homePlayer?.fullName],
            [m.awayPlayerId, m.awayPlayer?.fullName],
          ])
        );
        const eveningIds = new Set(eveningPlayerMap.keys());
        const selectedAbsentIds = new Set(subPairs.map((p) => p.absentId).filter(Boolean));
        const selectedSubIds = new Set(subPairs.map((p) => p.substituteId).filter(Boolean));
        const getPlayerName = (pid: string) =>
          eveningPlayerMap.get(pid) ||
          lPlayers.find((lp: any) => lp.playerId === pid)?.player?.fullName ||
          allPlayers.find((p: any) => p.id === pid)?.fullName ||
          pid;
        const canConfirm =
          subPairs.some((p) => p.absentId && p.substituteId) &&
          !subSaving &&
          (!subPreview || subPreview.canApply);

        return (
          <Modal onClose={closeSubstitute} wide scrollable>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-blue-400" /> Zamene igrača
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Ligaški Dan {subEvening}</p>
              </div>
              <button onClick={closeSubstitute} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2.5">
              {subPairs.map((pair, i) => (
                <div key={i} className="flex items-end gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-500 mb-1.5 font-medium">Odsutan</p>
                    <select className="input-field text-sm" value={pair.absentId}
                      onChange={(e) => updateSubPair(i, 'absentId', e.target.value)}>
                      <option value="">— Izaberi —</option>
                      {[...eveningPlayerMap.entries()].map(([pid, name]) => {
                        if (selectedAbsentIds.has(pid) && pair.absentId !== pid) return null;
                        return <option key={pid} value={pid}>{name}</option>;
                      })}
                    </select>
                  </div>
                  <div className="pb-2.5 text-slate-600"><ArrowLeftRight className="w-4 h-4" /></div>
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-500 mb-1.5 font-medium">Zamena</p>
                    <select className="input-field text-sm" value={pair.substituteId}
                      onChange={(e) => updateSubPair(i, 'substituteId', e.target.value)}>
                      <option value="">— Izaberi —</option>
                      {lPlayers
                        .filter((lp: any) => {
                          const p = lp.player;
                          if (!p?.id) return false;
                          // Absent players can't substitute (they're not there)
                          if (selectedAbsentIds.has(p.id)) return false;
                          // Scheduled (non-absent) players are already playing
                          if (eveningIds.has(lp.playerId)) return false;
                          // Already chosen as a substitute in another slot
                          if (selectedSubIds.has(lp.playerId) && pair.substituteId !== lp.playerId) return false;
                          return true;
                        })
                        .map((lp: any) => <option key={lp.playerId} value={lp.playerId}>{lp.player?.fullName}</option>)
                      }
                    </select>
                  </div>
                  {subPairs.length > 1 && (
                    <button onClick={() => { setSubPairs(subPairs.filter((_, j) => j !== i)); setSubPreview(null); }}
                      className="pb-2.5 p-1 text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setSubPairs([...subPairs, { absentId: '', substituteId: '' }])}
              className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Dodaj još zamenu
            </button>

            {(subPreviewLoading || subPreview) && (
              <div className="mt-4 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-slate-800 border-b border-slate-700">
                  <p className="text-xs font-semibold text-slate-300">Pregled zamene</p>
                </div>
                {subPreviewLoading && (
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-3 w-3/4" /><div className="skeleton h-3 w-1/2" />
                  </div>
                )}
                {subPreview && !subPreviewLoading && (
                  <div className="p-3 space-y-3 text-xs">
                    {/* Blocking-integrity warning banner */}
                    {!subPreview.canApply && (
                      <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Zamena nije moguća — par je već iskoristio dozvoljeni broj mečeva.</span>
                      </div>
                    )}
                    {subPreview.warnings?.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{getPlayerName(w.split(':')[0])} nema novih protivnika ovog ligaškog dana.</span>
                      </div>
                    ))}
                    {subPreview.willPostpone?.length > 0 && (
                      <SubPreviewSection label={`Odlažu se (${subPreview.willPostpone.length})`} color="text-amber-400" prefix="↷"
                        items={subPreview.willPostpone.map((m: any) => `${getPlayerName(m.homePlayerId)} vs ${getPlayerName(m.awayPlayerId)}`)} />
                    )}
                    {subPreview.willMove?.length > 0 && (
                      <SubPreviewSection label={`Premešta se (${subPreview.willMove.length})`} color="text-blue-400" prefix="→"
                        items={subPreview.willMove.map((m: any) => `${getPlayerName(m.homePlayerId)} vs ${getPlayerName(m.awayPlayerId)} (bio ligaški dan ${m.fromEvening})`)} />
                    )}
                    {subPreview.willCreate?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 text-slate-400">
                          Novi mečevi ({subPreview.willCreate.length})
                        </p>
                        <div className="space-y-1">
                          {subPreview.willCreate.map((m: any, i: number) => (
                            <div key={i} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
                              m.valid
                                ? 'bg-green-500/8 border-green-500/20'
                                : 'bg-red-500/8 border-red-500/20'
                            }`}>
                              {m.valid
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              }
                              <span className={`flex-1 ${m.valid ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                                {getPlayerName(m.homePlayerId)} vs {getPlayerName(m.awayPlayerId)}
                              </span>
                              {!m.valid && (
                                <span className="text-[10px] text-red-400 shrink-0 font-medium">
                                  {m.existingCount}/{m.maxAllowed} mečeva
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {subPreview.willSkip?.length > 0 && (
                      <SubPreviewSection label={`Preskočeni (${subPreview.willSkip.length})`} color="text-slate-500" prefix="✗"
                        items={subPreview.willSkip.map((m: any) => `${getPlayerName(m.homePlayerId)} vs ${getPlayerName(m.awayPlayerId)} — ${m.reason}`)} />
                    )}
                    {!subPreview.willCreate?.length && !subPreview.willMove?.length && (
                      <p className="text-red-400">Nema novih mečeva — izaberi drugog igrača.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={loadSubPreview}
                disabled={!subPairs.some((p) => p.absentId && p.substituteId) || subPreviewLoading}
                className="btn-secondary flex-1 justify-center text-sm disabled:opacity-40">
                {subPreviewLoading ? 'Učitavanje...' : 'Prikaži pregled'}
              </button>
              <button onClick={saveSubstitute} disabled={!canConfirm} className="btn-primary flex-1 justify-center text-sm disabled:opacity-40">
                {subSaving ? 'Čuvanje...' : 'Potvrdi zamene'}
              </button>
            </div>
            <button onClick={closeSubstitute} className="mt-2 w-full text-center text-xs text-slate-500 hover:text-slate-400 transition-colors">Otkaži</button>
          </Modal>
        );
      })()}

      {/* ══ MODAL: EvroLiga — Napreduj u sledeću fazu ══════════ */}
      {showAdvancePhaseModal && (() => {
        const activePhase = phases.find((p: any) => p.id === activePhaseView);
        const nextPhase   = phases.find((p: any) => p.phaseOrder === (activePhase?.phaseOrder ?? 0) + 1);

        const phaseDesc: Record<number, { who: string; detail: string }> = {
          2: { who: 'Igrači 9–20',         detail: 'iz Regularnog dela napreduju u Baraž' },
          3: { who: 'Top 8 + Top 2 Barаž', detail: '8 iz Regularnog + 2 iz Baraža napreduju u Top 10' },
          4: { who: 'Top 4',               detail: 'iz Top 10 napreduju u Playoff' },
        };
        const desc = nextPhase ? phaseDesc[nextPhase.phaseOrder] : null;

        const doAdvance = async () => {
          setShowAdvancePhaseModal(false);
          setAdvancingPhase(true);
          try {
            const ps = await leaguesApi.advancePhase(club!.id, id);
            setPhases(ps);
            const next = ps.find((p: any) => p.status === 'active');
            if (next) { setActivePhaseView(next.id); await loadPhaseData(next.id); setPhaseTab(next.type === 'knockout' ? 'bracket' : 'tabela'); }
          } finally { setAdvancingPhase(false); }
        };

        return (
          <Modal onClose={() => setShowAdvancePhaseModal(false)}>
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  <Trophy className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">Sledeća faza</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Završi trenutnu fazu i pokreni sledeću</p>
                </div>
              </div>
              <button onClick={() => setShowAdvancePhaseModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-700 transition-colors shrink-0"
                style={{ color: 'var(--text-secondary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Phase transition arrow */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Trenutna</p>
                <p className="text-sm font-bold text-white">{activePhase?.name ?? '—'}</p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 text-orange-400" />
              <div className="flex-1 rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.25)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#f97316' }}>Sledeća</p>
                <p className="text-sm font-bold text-white">{nextPhase?.name ?? '—'}</p>
              </div>
            </div>

            {/* Who advances */}
            {desc && (
              <div className="rounded-xl px-4 py-3 mb-5 flex items-start gap-3"
                style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <span className="text-amber-400 text-base shrink-0 leading-none mt-0.5">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-amber-300">{desc.who}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{desc.detail}</p>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="rounded-xl px-4 py-3 mb-6 flex items-start gap-3"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Ova akcija je <span className="font-semibold text-red-400">nepovratna</span>. Trenutna faza biće zatvorena i mečevi se više neće moći dodavati.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button onClick={() => setShowAdvancePhaseModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Otkaži
              </button>
              <button onClick={doAdvance}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 14px rgba(249,115,22,0.30)' }}>
                <ChevronRight className="w-4 h-4 shrink-0" />
                Potvrdi
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* ══ MODAL: EvroLiga — Unesi Rezultat ══════════════════ */}
      {phaseMatchModal && (() => {
        const m = phaseMatchModal;
        const isKnockout = ['semifinal_1', 'semifinal_2', 'final', 'third_place'].includes(m.phaseMatchType);
        // Knockout (playoff): best-of-3 sets, first to 2 wins → max entry is 2
        const max = isKnockout ? 2 : (league.setsPerMatch === 1 ? league.legsPerSet : (league.setsPerMatch || 3));
        const homeLeading = phaseHomeScore > phaseAwayScore && (phaseHomeScore > 0 || phaseAwayScore > 0);
        const awayLeading = phaseAwayScore > phaseHomeScore && (phaseHomeScore > 0 || phaseAwayScore > 0);
        const scoreError = (() => {
          const h = phaseHomeScore, a = phaseAwayScore;
          if (h < 0 || a < 0) return 'Rezultat ne može biti negativan';
          if (h > max || a > max) return `Maksimum je ${max}`;
          if (h === 0 && a === 0) return 'Rezultat ne može biti 0:0';
          if (isKnockout) {
            // Valid playoff scores: 2:0, 2:1, 0:2, 1:2
            const winner = h === 2 || a === 2;
            const valid  = winner && h !== a;
            if (!valid) return 'Playoff: pobednik mora da osvoji 2 seta (2:0 ili 2:1)';
            return null;
          }
          const minScore = Math.min(h, a);
          const maxScore = Math.max(h, a);
          const decisive = maxScore === max && minScore < max - 1;
          const draw = h === a && h === max - 1;
          if (!decisive && !draw) return `Pobeda: ${max}:0 — ${max}:${max - 2} | Remi: ${max - 1}:${max - 1}`;
          return null;
        })();

        const PhaseScoreCard = ({ side, label, name, score, leading }: { side: 'home' | 'away'; label: string; name: string; score: number; leading: boolean }) => (
          <div className="flex-1 flex flex-col items-center gap-3 rounded-2xl p-4 transition-all duration-200"
            style={{ backgroundColor: leading ? 'rgba(34,197,94,0.06)' : 'var(--bg-secondary)', border: leading ? '1px solid rgba(34,197,94,0.30)' : '1px solid var(--border)', boxShadow: leading ? '0 0 16px rgba(34,197,94,0.07)' : 'none' }}>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              <p className="text-sm font-bold leading-tight text-white truncate max-w-[110px]">{name}</p>
              {leading && <p className="text-[10px] text-green-400 font-semibold mt-0.5 animate-fade-in">● Vodi</p>}
            </div>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: leading ? 'rgba(34,197,94,0.10)' : 'rgba(30,41,59,0.60)', border: leading ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(51,65,85,0.6)' }}>
              <span key={score} className="text-5xl font-black tabular-nums leading-none animate-score-pop" style={{ color: leading ? '#4ade80' : 'white' }}>{score}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => side === 'home' ? setPhaseHomeScore(Math.max(0, phaseHomeScore - 1)) : setPhaseAwayScore(Math.max(0, phaseAwayScore - 1))}
                disabled={score <= 0} className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 disabled:opacity-25"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>−</button>
              <button onClick={() => side === 'home' ? setPhaseHomeScore(Math.min(max, phaseHomeScore + 1)) : setPhaseAwayScore(Math.min(max, phaseAwayScore + 1))}
                disabled={score >= max} className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 disabled:opacity-25 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25"
                style={{ border: '1px solid rgba(249,115,22,0.25)' }}>+</button>
            </div>
          </div>
        );

        return (
          <Modal onClose={() => setPhaseMatchModal(null)}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-400 shrink-0" />
                  {m.status === 'completed' ? 'Ispravi Rezultat' : 'Unos Rezultata'}
                </h3>
                <p className="text-xs mt-0.5 truncate max-w-[220px]" style={{ color: 'var(--text-secondary)' }}>
                  {m.homePlayer?.fullName} <span className="opacity-40">vs</span> {m.awayPlayer?.fullName}
                </p>
              </div>
              <button onClick={() => setPhaseMatchModal(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0 ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 my-5">
              <PhaseScoreCard side="home" label="Domaćin" name={m.homePlayer?.fullName} score={phaseHomeScore} leading={homeLeading} />
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-2xl font-thin text-slate-600">:</span>
                <span className="text-[10px] text-slate-600 font-medium">{isKnockout ? 'setova' : `max ${max}`}</span>
                {isKnockout && <span className="text-[9px] text-slate-700 font-medium">2:0 ili 2:1</span>}
              </div>
              <PhaseScoreCard side="away" label="Gost" name={m.awayPlayer?.fullName} score={phaseAwayScore} leading={awayLeading} />
            </div>
            {scoreError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1 animate-shake animate-fade-in text-sm"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171' }}>
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{scoreError}</span>
              </div>
            )}
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={async () => {
                  if (scoreError || !club?.id || !m.phaseId) return;
                  setPhaseSaveLoading(true);
                  try {
                    await leaguesApi.updatePhaseMatch(club.id, id, m.phaseId, m.id, phaseHomeScore, phaseAwayScore);
                    setPhaseMatchModal(null);
                    await loadPhaseData(activePhaseView);
                  } finally { setPhaseSaveLoading(false); }
                }}
                disabled={!!scoreError || phaseSaveLoading}
                className="btn-primary w-full justify-center py-3 text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {phaseSaveLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Čuvanje...</> : <><Check className="w-4 h-4" /> Sačuvaj rezultat</>}
              </button>
              <button onClick={() => setPhaseMatchModal(null)} className="btn-secondary w-full justify-center py-2.5 text-sm">Otkaži</button>
            </div>
          </Modal>
        );
      })()}

      {/* ══ MODAL: Unesi Rezultat ══════════════════════════════ */}
      {editMatch && (
        <Modal onClose={() => setEditMatch(null)}>
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400 shrink-0" />
                {editMatch.status === 'completed' ? 'Ispravi Rezultat' : 'Unos Rezultata'}
              </h3>
              <p className="text-xs mt-0.5 truncate max-w-[220px]" style={{ color: 'var(--text-secondary)' }}>
                {editMatch.homePlayer?.fullName} <span className="opacity-40">vs</span> {editMatch.awayPlayer?.fullName}
              </p>
            </div>
            <button
              onClick={() => setEditMatch(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {(() => {
            const max = league.setsPerMatch === 1 ? league.legsPerSet : league.setsPerMatch;
            const homeLeading = matchScores.home > matchScores.away && (matchScores.home > 0 || matchScores.away > 0);
            const awayLeading = matchScores.away > matchScores.home && (matchScores.home > 0 || matchScores.away > 0);

            const ScoreCard = ({
              side, label, name, score, leading,
            }: { side: 'home' | 'away'; label: string; name: string; score: number; leading: boolean }) => (
              <div
                className="flex-1 flex flex-col items-center gap-3 rounded-2xl p-4 transition-all duration-200"
                style={{
                  backgroundColor: leading ? 'rgba(34,197,94,0.06)' : 'var(--bg-secondary)',
                  border: leading
                    ? '1px solid rgba(34,197,94,0.30)'
                    : '1px solid var(--border)',
                  boxShadow: leading ? '0 0 16px rgba(34,197,94,0.07)' : 'none',
                }}
              >
                {/* Label + name */}
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                  </p>
                  <p className="text-sm font-bold leading-tight text-white truncate max-w-[110px]">{name}</p>
                  {leading && (
                    <p className="text-[10px] text-green-400 font-semibold mt-0.5 animate-fade-in">● Vodi</p>
                  )}
                </div>

                {/* Score display */}
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundColor: leading ? 'rgba(34,197,94,0.10)' : 'rgba(30,41,59,0.60)',
                    border: leading ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(51,65,85,0.6)',
                  }}
                >
                  <span
                    key={score}
                    className="text-5xl font-black tabular-nums leading-none animate-score-pop"
                    style={{ color: leading ? '#4ade80' : 'white' }}
                  >
                    {score}
                  </span>
                </div>

                {/* +/- controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMatchScores((s) => ({ ...s, [side]: Math.max(0, s[side] - 1) }))}
                    disabled={score <= 0}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 disabled:opacity-25"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    −
                  </button>
                  <button
                    onClick={() => setMatchScores((s) => ({ ...s, [side]: Math.min(max, s[side] + 1) }))}
                    disabled={score >= max}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 disabled:opacity-25 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25"
                    style={{ border: '1px solid rgba(249,115,22,0.25)' }}
                  >
                    +
                  </button>
                </div>
              </div>
            );

            return (
              <>
                {/* Score board */}
                <div className="flex items-center gap-3 my-5">
                  <ScoreCard side="home" label="Domaćin" name={editMatch.homePlayer?.fullName} score={matchScores.home} leading={homeLeading} />
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-2xl font-thin text-slate-600">:</span>
                    <span className="text-[10px] text-slate-600 font-medium">max {max}</span>
                  </div>
                  <ScoreCard side="away" label="Gost" name={editMatch.awayPlayer?.fullName} score={matchScores.away} leading={awayLeading} />
                </div>

                {/* Error */}
                {matchScoreError && (
                  <div
                    key={matchScoreError}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1 animate-shake animate-fade-in text-sm"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171' }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{matchScoreError}</span>
                  </div>
                )}
              </>
            );
          })()}

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={saveMatchResult}
              disabled={!!matchScoreError}
              className="btn-primary w-full justify-center py-3 text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              <Check className="w-4 h-4" /> Sačuvaj rezultat
            </button>
            <button
              onClick={() => setEditMatch(null)}
              className="btn-secondary w-full justify-center py-2.5 text-sm"
            >
              Otkaži
            </button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Valkover ════════════════════════════════════ */}
      {walkoverMatch && (
        <Modal onClose={() => setWalkoverMatch(null)}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-white flex items-center gap-2"><Ban className="w-4 h-4 text-red-400" /> Valkover</h3>
            <button onClick={() => setWalkoverMatch(null)} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-xs text-slate-500 mb-5">§8 — Neopravdan nedolazak. Protivnik dobija {league?.legsPerSet ?? 4}:0.</p>
          <p className="text-sm text-slate-300 mb-3 font-medium">Ko nije došao na meč?</p>
          <div className="space-y-2 mb-5">
            {[
              { id: walkoverMatch.homePlayerId, name: walkoverMatch.homePlayer?.fullName, label: 'Domaćin' },
              { id: walkoverMatch.awayPlayerId, name: walkoverMatch.awayPlayer?.fullName, label: 'Gost' },
            ].map((p) => (
              <label key={p.id} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.99] ${
                walkoverId === p.id ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
              }`}>
                <input type="radio" name="walkover" value={p.id} checked={walkoverId === p.id} onChange={() => setWalkoverId(p.id)} className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${walkoverId === p.id ? 'border-red-500 bg-red-500' : 'border-slate-600'}`}>
                  {walkoverId === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-xs text-slate-500 shrink-0">{p.label}</span>
                <span className="text-sm font-semibold text-white">{p.name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveWalkover} disabled={!walkoverId || walkoverSaving} className="btn-primary flex-1 justify-center text-sm disabled:opacity-40">
              {walkoverSaving ? 'Čuvanje...' : 'Potvrdi valkover'}
            </button>
            <button onClick={() => setWalkoverMatch(null)} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Odloži Meč ══════════════════════════════════ */}
      {postponeMatch && (
        <Modal onClose={() => setPostponeMatch(null)} wide>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Odloži Meč</h3>
            <button onClick={() => setPostponeMatch(null)} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-slate-400 mb-4">{postponeMatch.homePlayer?.fullName} vs {postponeMatch.awayPlayer?.fullName}</p>
          <div className="mb-5">
            <label className="block text-xs text-slate-400 mb-2">Novi datum (opciono)</label>
            <input type="datetime-local" className="input-field" value={postponeDate} onChange={(e) => setPostponeDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={savePostpone} disabled={postponeSaving} className="btn-primary flex-1 justify-center text-sm">
              {postponeSaving ? 'Čuvanje...' : 'Odloži'}
            </button>
            <button onClick={() => setPostponeMatch(null)} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Player Detail ════════════════════════════════ */}
      {selectedPlayer && (() => {
        const { completed, remaining } = getPlayerMatches(selectedPlayer.playerId);
        const standing = standings.find((s: any) => s.player?.id === selectedPlayer.playerId);
        const name     = selectedPlayer.player?.fullName ?? '';

        /* form: last 5 completed in reverse order */
        const recentForm = [...completed].slice(-5).reverse();
        const formColor  = (o: string) => o === 'win' ? 'bg-green-500' : o === 'loss' ? 'bg-red-500' : 'bg-slate-500';

        /* win rate bar */
        const winPct = standing?.played ? Math.round((standing.won / standing.played) * 100) : 0;

        /* open opponent modal */
        const openOpponent = (opponentId: string) => {
          const lp = lPlayers.find((x: any) => x.playerId === opponentId);
          if (lp) setSelectedPlayer(lp);
        };

        return (
          <Modal onClose={() => setSelectedPlayer(null)} wide scrollable>

            {/* ── HEADER ──────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3.5">
                {/* avatar */}
                <DartAvatar name={name} size="lg" animate />

                {/* identity */}
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{name}</h3>
                  {selectedPlayer.player?.nickname && (
                    <p className="text-xs text-slate-500 mt-0.5">"{selectedPlayer.player.nickname}"</p>
                  )}
                  {standing ? (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                        {standing.points} bod.
                      </span>
                      <span className="text-xs text-slate-500">#{standing.position} pozicija</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 mt-1">Bez mečeva</p>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── STATS 2×2 ───────────────────────────────────── */}
            {standing && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Mečevi',  value: standing.played, color: 'text-white',        bg: 'bg-slate-800',        icon: '🎯' },
                  { label: 'Pobede',  value: standing.won,    color: 'text-green-400',    bg: 'bg-green-500/8',      icon: '🟢' },
                  { label: 'Remiji',  value: standing.drawn,  color: 'text-slate-400',    bg: 'bg-slate-800',        icon: '⚪' },
                  { label: 'Porazi',  value: standing.lost,   color: 'text-red-400',      bg: 'bg-red-500/8',        icon: '🔴' },
                ].map(({ label, value, color, bg, icon }) => (
                  <div key={label} className={`${bg} rounded-xl px-3 py-2.5 flex items-center gap-3`}>
                    <span className="text-base leading-none">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
                      <p className={`text-xl font-bold ${color} tabular-nums leading-tight`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── WIN RATE BAR ─────────────────────────────────── */}
            {standing && standing.played > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">Win rate</span>
                  <span className="text-xs font-bold text-green-400">{winPct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden progress-track">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                    style={{ width: `${winPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── FORMA ────────────────────────────────────────── */}
            {recentForm.length > 0 && (
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide whitespace-nowrap">Forma</span>
                <div className="flex items-center gap-1.5">
                  {recentForm.map((m, i) => (
                    <span
                      key={i}
                      title={m.outcome === 'win' ? 'Pobeda' : m.outcome === 'loss' ? 'Poraz' : 'Remi'}
                      className={`w-2.5 h-2.5 rounded-full ${formColor(m.outcome)} stagger-${i + 1} animate-scale-in`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── MATCH HISTORY ────────────────────────────────── */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Poslednji mečevi {completed.length > 0 && `(${completed.length})`}
              </p>
              {completed.length === 0 ? (
                <p className="text-xs text-slate-600 py-2">Nema odigranih mečeva.</p>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                  {[...completed].reverse().map((m) => (
                    <button
                      key={m.matchId}
                      onClick={() => openOpponent(m.opponentId)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group
                        ${m.outcome === 'win'  ? 'hover:bg-green-500/10'  :
                          m.outcome === 'loss' ? 'hover:bg-red-500/10'    : 'hover:bg-slate-700/50'}
                      `}
                    >
                      {/* result dot */}
                      <span className={`w-2 h-2 rounded-full shrink-0 ${formColor(m.outcome)}`} />

                      {/* opponent avatar + name */}
                      <Avatar name={m.opponentName ?? ''} size="sm" />
                      <span className="text-sm text-white flex-1 truncate group-hover:text-orange-300 transition-colors">
                        {m.opponentName}
                      </span>

                      {/* score */}
                      <span className={`text-sm font-bold tabular-nums shrink-0
                        ${m.outcome === 'win' ? 'text-green-400' : m.outcome === 'loss' ? 'text-red-400' : 'text-slate-400'}
                      `}>
                        {m.myScore}:{m.oppScore}
                      </span>
                      {m.isWalkover && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-md font-bold shrink-0">WO</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── PREOSTALI PROTIVNICI ──────────────────────────── */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Preostali protivnici {remaining.length > 0 && `(${remaining.length})`}
              </p>
              {remaining.length === 0 ? (
                <p className="text-xs text-green-400 py-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Svi mečevi odigrani!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {remaining.map((oppName) => {
                    const oppLp = lPlayers.find((x: any) => (x.player?.fullName ?? x.playerId) === oppName);
                    return (
                      <button
                        key={oppName}
                        onClick={() => oppLp && setSelectedPlayer(oppLp)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl transition-all
                          ${oppLp ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600 hover:text-white active:scale-95' : 'bg-slate-800 text-slate-500 cursor-default'}
                        `}
                      >
                        <Avatar name={oppName} player={oppLp?.player} size="sm" />
                        {oppName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </Modal>
        );
      })()}

      {/* ══════════════════ EVROLIGA ══════════════════════════════ */}
      {isEuroleague && (
        <div className="px-4 md:px-6 pb-6">
          {(() => {
        const TBD_ID = '00000000-0000-0000-0000-000000000001';
        const activePhase = phases.find((p: any) => p.id === activePhaseView);
        const isPlayoff   = activePhase?.type === 'knockout';
        const allPending  = phases.length > 0 && phases.every((p: any) => p.status === 'pending');
        const canAdvance  = canEdit && activePhase?.status === 'active' && phases.find((p: any) => p.phaseOrder === (activePhase?.phaseOrder ?? 0) + 1);

        /* ── phase standings-based colors ── */
        const medalColor  = (pos: number) =>
          pos === 1 ? '#facc15' : pos === 2 ? '#cbd5e1' : pos === 3 ? '#f97316' : 'var(--text-secondary)';

        /* ── phase rounds (for Raspored tab) ── */
        const phaseByRound: Record<number, any[]> = {};
        for (const m of phaseFixtures) {
          const r = m.roundNumber ?? 1;
          if (!phaseByRound[r]) phaseByRound[r] = [];
          phaseByRound[r].push(m);
        }

        /* ── playoff matches ── */
        const sf1         = phaseFixtures.find((m: any) => m.phaseMatchType === 'semifinal_1');
        const sf2         = phaseFixtures.find((m: any) => m.phaseMatchType === 'semifinal_2');
        const final       = phaseFixtures.find((m: any) => m.phaseMatchType === 'final');
        const thirdPlace  = phaseFixtures.find((m: any) => m.phaseMatchType === 'third_place');

        /* ── PlayoffCard ── */
        const PlayoffCard = ({ match, label }: { match: any; label: string }) => {
          if (!match) return (
            <div className="rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center h-28 text-slate-600 text-sm font-medium">
              {label}
            </div>
          );

          // Each slot checked independently — show known player even if the other is still TBD
          const homeTBD  = !match.homePlayerId || match.homePlayerId === TBD_ID || !match.homePlayer;
          const awayTBD  = !match.awayPlayerId || match.awayPlayerId === TBD_ID || !match.awayPlayer;
          const anyTBD   = homeTBD || awayTBD;
          const done     = match.status === 'completed';
          const homeWon  = done && match.winnerId === match.homePlayerId;
          const awayWon  = done && match.winnerId === match.awayPlayerId;
          const home     = match.homePlayer;
          const away     = match.awayPlayer;
          const canClick = canEdit && !anyTBD && !done;

          const PlayerSlot = ({ player, tbd, won, lost, sets }: { player: any; tbd: boolean; won: boolean; lost: boolean; sets?: number }) => (
            <div className={`flex items-center gap-2.5 transition-opacity ${lost ? 'opacity-35' : ''}`}>
              {!tbd ? (
                <Avatar name={player?.fullName} player={player} size="sm" />
              ) : (
                <div className="w-7 h-7 rounded-full border border-dashed border-slate-600 shrink-0 flex items-center justify-center text-slate-600 text-xs">?</div>
              )}
              <span className={`flex-1 text-sm truncate ${won ? 'font-bold' : 'font-medium'} ${tbd ? 'italic' : ''}`}
                style={{ color: won ? '#f97316' : tbd ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                {tbd ? 'TBD' : (player?.fullName || '—')}
              </span>
              {done && sets !== undefined && <span className={`text-xl font-black tabular-nums ${won ? 'text-white' : 'text-slate-500'}`}>{sets}</span>}
              {won && <span className="text-orange-400 text-xs">🏆</span>}
            </div>
          );

          return (
            <button
              onClick={() => { if (canClick) { setPhaseMatchModal(match); setPhaseHomeScore(match.homeSets ?? 0); setPhaseAwayScore(match.awaySets ?? 0); } }}
              className={`w-full rounded-2xl border text-left transition-all duration-200 overflow-hidden
                ${done ? 'border-slate-700' : anyTBD ? 'border-slate-700/50' : 'border-slate-600 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97]'}
                ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              {/* Label bar */}
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-center"
                style={{ backgroundColor: 'rgba(249,115,22,0.08)', color: '#f97316', borderBottom: '1px solid var(--border)' }}>
                {label}
              </div>
              <div className="px-4 py-3 space-y-2">
                <PlayerSlot player={home} tbd={homeTBD} won={homeWon} lost={awayWon} sets={done ? match.homeSets : undefined} />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                  <span className="text-xs font-bold text-slate-600">{done ? 'vs' : anyTBD ? '⋯' : 'VS'}</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                </div>
                <PlayerSlot player={away} tbd={awayTBD} won={awayWon} lost={homeWon} sets={done ? match.awaySets : undefined} />
              </div>
            </button>
          );
        };

        /* ── Empty state: phases not yet initialized ── */
        if (phases.length === 0) {
          return (
            <div className="animate-fade-in-up">
              <div className="card px-6 py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  🏆
                </div>
                <div>
                  <p className="text-white font-semibold text-base">EvroLiga nije pokrenuta</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Igrači su dodati — klikni dugme da pokreneš EvroLigu i generišeš regularni deo.
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={generate}
                    disabled={generating || lPlayers.length < 2}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Pokretanje...</>
                      : '⚡ Pokreni EvroLigu'}
                  </button>
                )}
                {lPlayers.length < 2 && (
                  <p className="text-xs text-slate-500">Potrebna su najmanje 2 igrača (trenutno: {lPlayers.length})</p>
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="animate-fade-in-up space-y-4">

            {/* ── Row 1: Phase pills (like main tab bar) + Sledeća faza ── */}
            <div className="flex items-center gap-3 justify-between flex-wrap">
              <div className="overflow-x-auto pb-0.5 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit min-w-max">
                  {phases.map((p: any) => {
                    const isActive = p.id === activePhaseView;
                    const statusDot =
                      p.status === 'active'    ? '#f97316' :
                      p.status === 'completed' ? '#34d399' : '#64748b';
                    return (
                      <button
                        key={p.id}
                        onClick={async () => { setActivePhaseView(p.id); await loadPhaseData(p.id); setPhaseTab(p.type === 'knockout' ? 'bracket' : 'tabela'); }}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap
                          ${isActive ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusDot }} />
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              {canAdvance && (
                <button
                  disabled={advancingPhase}
                  onClick={() => setShowAdvancePhaseModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-50 shrink-0"
                >
                  {advancingPhase ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Sledeća faza
                </button>
              )}
            </div>

            {/* ── Row 2: Content sub-tabs (Tabela / Večeri / Igrači or Bracket / Igrači) ── */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-0.5">
              <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit min-w-max">
                {(isPlayoff
                  ? [{ id: 'bracket', label: 'Bracket', icon: <Trophy className="w-3.5 h-3.5" /> }, { id: 'igraci', label: 'Igrači', icon: <Users className="w-3.5 h-3.5" /> }]
                  : [{ id: 'tabela', label: 'Tabela', icon: <BarChart3 className="w-3.5 h-3.5" /> }, { id: 'raspored', label: 'Raspored', icon: <Calendar className="w-3.5 h-3.5" /> }, { id: 'igraci', label: 'Igrači', icon: <Users className="w-3.5 h-3.5" /> }, { id: 'matrica', label: 'Matrica', icon: <Grid3x3 className="w-3.5 h-3.5" /> }]
                ).map((pt) => (
                  <button key={pt.id} onClick={() => setPhaseTab(pt.id as any)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap
                      ${phaseTab === pt.id ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                    {pt.icon} {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {phaseLoading && phaseTab !== 'igraci' && (
              <div className="card px-4 py-8 flex items-center justify-center text-slate-500 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Učitavanje...
              </div>
            )}

            {/* ── Action bar (Tabela tab only) ── */}
            {!phaseLoading && !isPlayoff && phaseTab === 'tabela' && (
              <div className="flex items-center gap-2 flex-wrap">
                {lPlayers.length > 0 && (
                  <button
                    onClick={handleDownloadPlayerSheet}
                    disabled={downloadingPlayerSheet}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-300 text-xs font-medium hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50"
                  >
                    {downloadingPlayerSheet
                      ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-300 rounded-full" />
                      : <Download className="w-3.5 h-3.5 shrink-0" />
                    }
                    <span className="hidden sm:inline">Lista igrača</span>
                  </button>
                )}
                {phaseStandings.length > 0 && (
                  <button
                    onClick={handleDownloadStandings}
                    disabled={downloadingStandings}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-all disabled:opacity-50"
                  >
                    {downloadingStandings
                      ? <span className="animate-spin w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-400 rounded-full" />
                      : <Download className="w-3.5 h-3.5 shrink-0" />
                    }
                    <span className="hidden sm:inline">Tabela PDF</span>
                  </button>
                )}
              </div>
            )}

            {/* ── TABELA phase standings ── */}
            {!phaseLoading && !isPlayoff && phaseTab === 'tabela' && (() => {
              if (phaseStandings.length === 0) {
                return <div className="card px-4 py-8 text-center text-slate-500 text-sm">Nema podataka za ovu fazu</div>;
              }

              const phaseWinRate = (s: any) => s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
              const top3 = phaseStandings.slice(0, 3);
              const bestWins = [...phaseStandings].sort((a: any, b: any) => b.wins - a.wins)[0];
              const mostSets = [...phaseStandings].sort((a: any, b: any) => b.setsFor - a.setsFor)[0];
              const ptGap = phaseStandings.length > 1 ? phaseStandings[0].points - phaseStandings[1].points : 0;
              const top5wr = phaseStandings.slice(0, Math.min(5, phaseStandings.length));
              const maxWr = Math.max(...top5wr.map(phaseWinRate), 1);

              const pMedalBg = (pos: number) =>
                pos === 1 ? 'rgba(234,179,8,0.12)' : pos === 2 ? 'rgba(148,163,184,0.10)' : 'rgba(180,83,9,0.10)';
              const pMedalBorder = (pos: number) =>
                pos === 1 ? 'rgba(234,179,8,0.30)' : pos === 2 ? 'rgba(148,163,184,0.25)' : 'rgba(180,83,9,0.28)';
              const pMedalText = (pos: number) =>
                pos === 1 ? '#facc15' : pos === 2 ? '#cbd5e1' : '#f97316';
              const pMedalEmoji = (pos: number) =>
                pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';

              return (
                <div className="space-y-4">
                  {/* ── TOP 3 PODIUM ── */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {top3.map((s: any, i: number) => (
                      <div key={s.playerId}
                        onClick={() => setSelectedPlayer(lPlayers.find((lp: any) => lp.playerId === s.player?.id))}
                        className="rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 animate-fade-in-up cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: pMedalBg(s.position), border: `1px solid ${pMedalBorder(s.position)}`,
                          boxShadow: s.position === 1 ? '0 0 24px rgba(234,179,8,0.08), 0 4px 16px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.12)',
                          animationDelay: `${i * 60}ms` }}>
                        <span className="text-xl sm:text-2xl leading-none">{pMedalEmoji(s.position)}</span>
                        <Avatar name={s.player?.fullName} player={s.player} size="lg" winRate={phaseWinRate(s)} rank={s.position} />
                        <div className="text-center min-w-0 w-full">
                          <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">{s.player?.fullName?.split(' ')[0]}</p>
                          <p className="text-[10px] text-slate-400 truncate hidden sm:block">{s.player?.fullName?.split(' ').slice(1).join(' ')}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-lg sm:text-2xl font-black tabular-nums leading-none" style={{ color: pMedalText(s.position) }}>{s.points}</span>
                          <span className="text-[10px] text-slate-500">bod.</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{phaseWinRate(s)}% pobeda</div>
                      </div>
                    ))}
                  </div>

                  {/* ── INSIGHTS ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { icon: <Trophy className="w-3.5 h-3.5 text-yellow-400" />, label: 'Lider', value: phaseStandings[0]?.player?.fullName?.split(' ')[0], sub: `${phaseStandings[0]?.points} bod.`, color: 'text-yellow-400' },
                      { icon: <Zap className="w-3.5 h-3.5 text-green-400" />, label: 'Najviše pobeda', value: bestWins?.player?.fullName?.split(' ')[0], sub: `${bestWins?.wins} P`, color: 'text-green-400' },
                      { icon: <Target className="w-3.5 h-3.5 text-orange-400" />, label: 'Najviše setova', value: mostSets?.player?.fullName?.split(' ')[0], sub: `${mostSets?.setsFor} S+`, color: 'text-orange-400' },
                      { icon: <BarChart3 className="w-3.5 h-3.5 text-blue-400" />, label: 'Prednost #1', value: ptGap === 0 ? 'Izjednačeno' : `+${ptGap}`, sub: ptGap === 0 ? '—' : 'bodova pred #2', color: 'text-blue-400' },
                    ].map((ins, i) => (
                      <div key={ins.label} className="card p-3 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-1.5 mb-1.5">{ins.icon}<span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{ins.label}</span></div>
                        <p className={`text-sm font-bold truncate ${ins.color}`}>{ins.value}</p>
                        <p className="insight-sub">{ins.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── WIN RATE CHART ── */}
                  <div className="card p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">% Pobeda · Top {top5wr.length}</p>
                    <div className="space-y-2.5">
                      {top5wr.map((s: any, i: number) => {
                        const wr = phaseWinRate(s);
                        return (
                          <div key={s.playerId} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                            <span className="text-[11px] text-slate-500 w-4 tabular-nums text-right shrink-0">{i + 1}</span>
                            <span className="text-xs text-slate-300 w-20 truncate shrink-0">{s.player?.fullName?.split(' ')[0]}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden progress-track">
                              <div className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${(wr / maxWr) * 100}%`, background: i === 0 ? 'linear-gradient(90deg,#facc15,#f97316)' : 'linear-gradient(90deg,#f97316,#fb923c)' }} />
                            </div>
                            <span className="text-[11px] font-semibold tabular-nums w-8 text-right shrink-0" style={{ color: i === 0 ? '#facc15' : '#fb923c' }}>{wr}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── FULL TABLE ── */}
                  <div className="card" style={{ overflow: 'clip' }}>
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                            {['#', 'Igrač', 'M', 'P', 'R', 'G', 'S+', 'S−', 'Bod.'].map(h => (
                              <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {phaseStandings.map((s: any, idx: number) => (
                            <tr key={s.playerId}
                              onClick={() => setSelectedPlayer(lPlayers.find((lp: any) => lp.playerId === s.player?.id))}
                              className="cursor-pointer transition-colors animate-fade-in table-row-hover"
                              style={{ borderBottom: '1px solid var(--border)', backgroundColor: s.position === 1 ? 'rgba(234,179,8,0.03)' : undefined, animationDelay: `${idx * 25}ms` }}>
                              <td className="px-4 py-3 w-10"><RankBadge pos={s.position} /></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={s.player?.fullName} player={s.player} winRate={phaseWinRate(s)} rank={s.position} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-white text-sm truncate">{s.player?.fullName}</span>
                                      {s.position === 1 && <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <div className="h-1 w-12 rounded-full overflow-hidden progress-track">
                                        <div className="h-full rounded-full"
                                          style={{ width: `${phaseWinRate(s)}%`, backgroundColor: phaseWinRate(s) >= 60 ? '#4ade80' : phaseWinRate(s) >= 40 ? '#fb923c' : '#f87171' }} />
                                      </div>
                                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{phaseWinRate(s)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-400 tabular-nums">{s.played}</td>
                              <td className="px-4 py-3 font-semibold text-green-400 tabular-nums">{s.wins}</td>
                              <td className="px-4 py-3 font-medium text-yellow-400 tabular-nums">{s.draws}</td>
                              <td className="px-4 py-3 font-medium text-red-400 tabular-nums">{s.losses}</td>
                              <td className="px-4 py-3 text-slate-300 tabular-nums">{s.setsFor}</td>
                              <td className="px-4 py-3 text-slate-500 tabular-nums">{s.setsAgainst}</td>
                              <td className="px-4 py-3">
                                <span className="text-lg font-black text-orange-400 tabular-nums leading-none">{s.points}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                      {phaseStandings.map((s: any, idx: number) => (
                        <div key={s.playerId}
                          onClick={() => setSelectedPlayer(lPlayers.find((lp: any) => lp.playerId === s.player?.id))}
                          className="px-4 py-3.5 animate-fade-in cursor-pointer active:bg-slate-800/50 transition-colors"
                          style={{ backgroundColor: s.position === 1 ? 'rgba(234,179,8,0.03)' : undefined, animationDelay: `${idx * 25}ms` }}>
                          <div className="flex items-center gap-3">
                            <RankBadge pos={s.position} />
                            <Avatar name={s.player?.fullName} player={s.player} rank={s.position} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white text-sm truncate">{s.player?.fullName}</span>
                                {s.position === 1 && <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2.5 mt-1">
                                <span className="text-[11px] font-medium text-green-400">{s.wins}P</span>
                                {s.draws > 0 && <span className="text-[11px] font-medium text-yellow-400">{s.draws}R</span>}
                                <span className="text-[11px] font-medium text-red-400">{s.losses}G</span>
                                <span className="text-[11px] text-slate-500">{s.played} M</span>
                                <span className="text-[11px] text-slate-600">{s.setsFor}/{s.setsAgainst}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="h-1 w-20 rounded-full overflow-hidden progress-track">
                                  <div className="h-full rounded-full"
                                    style={{ width: `${phaseWinRate(s)}%`, backgroundColor: phaseWinRate(s) >= 60 ? '#4ade80' : phaseWinRate(s) >= 40 ? '#fb923c' : '#f87171' }} />
                                </div>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{phaseWinRate(s)}%</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-2xl font-black text-orange-400 tabular-nums leading-none">{s.points}</span>
                              <p className="text-[10px] text-slate-500 mt-0.5">bodova</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
                    {[
                      { color: 'text-green-400', label: 'P – Pobeda' },
                      { color: 'text-yellow-400', label: 'R – Remi' },
                      { color: 'text-red-400', label: 'G – Gubitak' },
                      { color: 'text-slate-400', label: 'M – Mečevi' },
                      { color: 'text-slate-500', label: 'S+/S− – Setovi' },
                    ].map(({ color, label }) => (
                      <span key={label} className={`text-[11px] ${color}`}>{label}</span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── VEČERI — session UI for round-robin phases (same look as session-mode leagues) ── */}
            {!phaseLoading && !isPlayoff && phaseTab === 'raspored' && (() => {
              const pendingInPool   = phaseFixtures.filter((m: any) => m.status === 'pending' && !m.sessionId).length;
              const activeSession   = sessions.find((s: any) => s.status === 'open');
              const closedSessions  = sessions.filter((s: any) => s.status !== 'open');
              const totalInSessions = sessions.reduce((a: number, s: any) => a + (s.matchCount || 0), 0);
              const completedTotal  = sessions.reduce((a: number, s: any) => a + (s.completedCount || 0), 0);
              const pct = totalInSessions > 0 ? Math.round((completedTotal / totalInSessions) * 100) : 0;

              if (phaseFixtures.length === 0) {
                return <div className="card px-4 py-8 text-center text-slate-500 text-sm">Nema mečeva za ovu fazu</div>;
              }

              if (sessions.length === 0) {
                return (
                  <div className="card p-8 text-center">
                    <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-white mb-1">Nema ligaških dana</p>
                    <p className="text-xs text-slate-500 mb-4">
                      Pool ima {phaseFixtures.length} mečeva. Odaberi prisutne igrače i kreiraj prvi ligaški dan.
                    </p>
                    {canEdit && (
                      <button onClick={openNewSession} className="btn-primary text-sm mx-auto flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Nova večer
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {/* ── HEADER / OVERVIEW CARD ── */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="text-sm font-semibold text-white">Ligaški dani — {activePhase?.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="text-white font-semibold">{completedTotal}</span>
                          <span className="text-slate-500"> / {totalInSessions} odigrano</span>
                          {pendingInPool > 0 && <span className="text-slate-600 ml-2">· {pendingInPool} u pool-u</span>}
                        </p>
                      </div>
                      {canEdit && (
                        <button onClick={openNewSession} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 shrink-0">
                          <Plus className="w-4 h-4" /> Novi Dan
                        </button>
                      )}
                    </div>
                    <div className="h-2 rounded-full overflow-hidden progress-track">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#f97316,#fb923c)' }} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 flex-wrap gap-1">
                      <div className="flex items-center gap-3">
                        {activeSession && (
                          <span className="flex items-center gap-1.5 text-[11px] text-orange-400">
                            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block animate-pulse" />
                            1 aktivna
                          </span>
                        )}
                        {closedSessions.length > 0 && <span className="text-[11px] text-slate-500">{closedSessions.length} završenih</span>}
                        <span className="text-[11px] text-slate-600">· {sessions.length} ukupno</span>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: pct === 100 ? '#4ade80' : '#fb923c' }}>{pct}%</span>
                    </div>
                  </div>

                  {/* ── ACTIVE SESSION HERO ── */}
                  {activeSession && (() => {
                    const sm = phaseFixtures.filter((m: any) => m.sessionId === activeSession.id);
                    const pendingMs = sm.filter((m: any) => m.status !== 'completed');
                    const doneCount = sm.filter((m: any) => m.status === 'completed').length;
                    const sPct = activeSession.matchCount > 0 ? Math.round((doneCount / activeSession.matchCount) * 100) : 0;
                    return (
                      <div className="rounded-2xl overflow-hidden"
                        style={{ border: '1px solid rgba(249,115,22,0.30)', boxShadow: '0 0 0 1px rgba(249,115,22,0.06), 0 4px 24px rgba(249,115,22,0.07)', backgroundColor: 'var(--bg-card)' }}>
                        {/* Hero header */}
                        <div className="px-4 pt-4 pb-3"
                          style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.07) 0%,transparent 55%)', borderBottom: '1px solid rgba(249,115,22,0.14)' }}>
                          <div className="flex items-start gap-3">
                            {/* Number badge with live ping */}
                            <div className="relative shrink-0 mt-0.5">
                              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                                <span className="text-base font-bold text-orange-400">{activeSession.sessionNumber}</span>
                              </div>
                              <span className="absolute -top-1 -right-1 flex">
                                <span className="relative w-3 h-3 rounded-full bg-orange-500 border-2 border-[var(--bg-card)]">
                                  <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-70" />
                                </span>
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-bold text-white leading-tight">Ligaški Dan {activeSession.sessionNumber}</h3>
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-orange-500/15 text-orange-400 border border-orange-500/25 rounded-full font-semibold uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Aktivan
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <Users className="w-3 h-3 text-slate-500 shrink-0" />
                                  {activeSession.presentPlayerIds?.length ?? 0} igrača
                                </span>
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <Target className="w-3 h-3 text-slate-500 shrink-0" />
                                  {doneCount}/{activeSession.matchCount} odigrano
                                </span>
                                {activeSession.sessionDate && (
                                  <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                                    {new Date(activeSession.sessionDate).toLocaleDateString('sr-RS')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {canEdit && (
                              <button onClick={() => handleDeleteSession(activeSession.id)} disabled={deletingSession === activeSession.id}
                                className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 disabled:opacity-50" title="Obriši sesiju">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Session progress bar */}
                          {activeSession.matchCount > 0 && (
                            <div className="mt-3">
                              <div className="h-1.5 rounded-full overflow-hidden progress-track">
                                <div className="h-full bg-orange-500/60 rounded-full transition-all duration-700" style={{ width: `${sPct}%` }} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-slate-500">{pendingMs.length} preostalih</span>
                                <span className="text-[10px] font-semibold text-orange-400">{sPct}%</span>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          {canEdit && (
                            <div className="hidden lg:flex items-center gap-2 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleDownloadScoresheet(activeSession, sm)} disabled={downloadingScoresheet === activeSession.id}
                                className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-xl transition-all font-medium disabled:opacity-50">
                                {downloadingScoresheet === activeSession.id
                                  ? <span className="animate-spin w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-400 rounded-full inline-block" />
                                  : <Download className="w-3.5 h-3.5" />}
                                Raspored
                              </button>
                              {doneCount > 0 && (
                                <button onClick={() => handleDownloadPDF(activeSession.sessionNumber, sm)} disabled={downloadingRound === activeSession.sessionNumber}
                                  className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/40 rounded-xl transition-all font-medium disabled:opacity-50">
                                  {downloadingRound === activeSession.sessionNumber
                                    ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-300 rounded-full inline-block" />
                                    : <Download className="w-3.5 h-3.5" />}
                                  Rezultati PDF
                                </button>
                              )}
                              <button onClick={() => handleCloseSession(activeSession.id)} disabled={closingSession === activeSession.id}
                                className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-slate-700/60 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-600/40 hover:border-red-500/25 rounded-xl transition-all font-medium disabled:opacity-50 ml-auto">
                                {closingSession === activeSession.id
                                  ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full inline-block" />
                                  : <Lock className="w-3.5 h-3.5" />}
                                Zatvori Sesiju
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Match list */}
                        {sm.length > 0 ? (
                          <>
                            {pendingMs.length > 0 && (
                              <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(249,115,22,0.08)' }}>
                                <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
                                  Naredni mečevi · {pendingMs.length} preostalih
                                </span>
                              </div>
                            )}
                            <div className="divide-y divide-slate-700/30">
                              {sm.map((m: any, idx: number) => {
                                const completed = m.status === 'completed';
                                const homeWon   = completed && m.homeSets > m.awaySets;
                                const awayWon   = completed && m.awaySets > m.homeSets;
                                const isDraw    = completed && m.homeSets === m.awaySets;
                                return (
                                  <div key={m.id} className={`flex items-center px-3 sm:px-4 py-3 gap-2 transition-colors ${completed ? 'opacity-55' : 'hover:bg-orange-500/[0.025]'}`}>
                                    <span className="text-[10px] text-slate-700 w-4 shrink-0 tabular-nums text-center">{idx + 1}</span>
                                    <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                                      {homeWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                      <span className={`text-sm font-medium text-right truncate ${homeWon ? 'text-green-400' : awayWon ? 'text-slate-500' : 'text-white'}`}>
                                        {m.homePlayer?.fullName}
                                      </span>
                                    </div>
                                    <div className="w-14 text-center shrink-0">
                                      {completed ? (
                                        <span className={`text-sm font-bold tabular-nums px-1.5 py-0.5 rounded-lg ${isDraw ? 'text-yellow-400 bg-yellow-500/10' : homeWon ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                          {m.homeSets}:{m.awaySets}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-slate-600 font-bold tracking-wider">vs</span>
                                      )}
                                    </div>
                                    <div className="flex-1 flex items-center gap-1 min-w-0">
                                      {awayWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                      <span className={`text-sm font-medium truncate ${awayWon ? 'text-green-400' : homeWon ? 'text-slate-500' : 'text-white'}`}>
                                        {m.awayPlayer?.fullName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {canEdit && !completed && (
                                        <button
                                          onClick={() => { setPhaseMatchModal(m); setPhaseHomeScore(m.homeSets ?? 0); setPhaseAwayScore(m.awaySets ?? 0); }}
                                          className="text-xs px-3 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg transition-colors font-semibold touch-target">
                                          Unesi
                                        </button>
                                      )}
                                      {canEdit && completed && (
                                        <button
                                          onClick={() => { setPhaseMatchModal(m); setPhaseHomeScore(m.homeSets ?? 0); setPhaseAwayScore(m.awaySets ?? 0); }}
                                          className="text-[11px] px-2 py-1 text-slate-600 hover:text-slate-300 rounded-lg transition-colors">
                                          Ispravi
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="px-4 py-6 text-center text-xs text-slate-500">
                            Mečevi se učitavaju — klikni "Zatvori" pa ponovo otvori sesiju da ih vidiš.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── PRETHODNE SESIJE ── */}
                  {closedSessions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest px-1 mb-2 text-slate-500">
                        Prethodne sesije ({closedSessions.length})
                      </p>
                      <div className="card overflow-hidden">
                        {closedSessions.map((session: any, sIdx: number) => {
                          const isExp  = expandedSessions.has(session.id);
                          const sm2    = phaseFixtures.filter((m: any) => m.sessionId === session.id);
                          const done   = session.completedCount ?? sm2.filter((m: any) => m.status === 'completed').length;
                          const total  = session.matchCount ?? sm2.length;
                          const full   = total > 0 && done === total;
                          const rowPct = total > 0 ? (done / total) * 100 : 0;
                          return (
                            <div key={session.id} className={sIdx > 0 ? 'border-t border-slate-700/40' : ''}>
                              {/* Timeline row */}
                              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none group transition-colors hover:bg-slate-800/25"
                                onClick={() => toggleExpanded(session.id)}>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${full ? 'bg-green-400' : 'bg-slate-500'}`} />
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${full ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/60 text-slate-400'}`}>
                                  {session.sessionNumber}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-white">Ligaški Dan {session.sessionNumber}</span>
                                  {session.sessionDate && (
                                    <span className="text-[11px] text-slate-500 ml-2">
                                      {new Date(session.sessionDate).toLocaleDateString('sr-RS')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span className={`hidden sm:inline text-xs font-medium ${full ? 'text-green-400' : 'text-slate-500'}`}>
                                    {full ? 'Završena' : 'Zatvorena'}
                                  </span>
                                  <span className="text-xs text-slate-500 tabular-nums">{done}/{total}</span>
                                  <div className="w-14 h-1.5 rounded-full overflow-hidden hidden sm:block progress-track">
                                    <div className={`h-full rounded-full transition-all duration-500 ${full ? 'bg-green-500/60' : 'bg-slate-500/50'}`}
                                      style={{ width: `${rowPct}%` }} />
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-transform duration-200 ${isExp ? 'rotate-180' : ''}`} />
                                </div>
                              </div>

                              {/* Accordion */}
                              {isExp && (
                                <div className="border-t border-slate-700/40 bg-slate-900/20 animate-fade-in">
                                  <div className="flex items-center gap-1.5 px-4 py-2.5 flex-wrap"
                                    style={{ borderBottom: sm2.length > 0 ? '1px solid rgba(51,65,85,0.4)' : undefined }}
                                    onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => handleDownloadScoresheet(session, sm2)} disabled={downloadingScoresheet === session.id}
                                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-colors font-medium disabled:opacity-50">
                                      {downloadingScoresheet === session.id
                                        ? <span className="animate-spin w-3 h-3 border-2 border-orange-400/30 border-t-orange-400 rounded-full inline-block" />
                                        : <Download className="w-3.5 h-3.5" />}
                                      Raspored
                                    </button>
                                    {done > 0 && (
                                      <button onClick={() => handleDownloadPDF(session.sessionNumber, sm2)} disabled={downloadingRound === session.sessionNumber}
                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors font-medium disabled:opacity-50">
                                        {downloadingRound === session.sessionNumber
                                          ? <span className="animate-spin w-3 h-3 border-2 border-slate-400/30 border-t-slate-300 rounded-full inline-block" />
                                          : <Download className="w-3.5 h-3.5" />}
                                        Rezultati PDF
                                      </button>
                                    )}
                                    {canEdit && (
                                      <button onClick={() => handleDeleteSession(session.id)} disabled={deletingSession === session.id}
                                        className="ml-auto p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50" title="Obriši sesiju">
                                        {deletingSession === session.id
                                          ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-600/30 border-t-slate-500 rounded-full inline-block" />
                                          : <Trash2 className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                  </div>
                                  {sm2.length > 0 ? (
                                    <div className="divide-y divide-slate-700/20">
                                      {sm2.map((m: any, idx: number) => {
                                        const completed = m.status === 'completed';
                                        const homeWon   = completed && m.homeSets > m.awaySets;
                                        const awayWon   = completed && m.awaySets > m.homeSets;
                                        const isDraw    = completed && m.homeSets === m.awaySets;
                                        return (
                                          <div key={m.id} className="flex items-center px-4 py-2.5 gap-2 hover:bg-slate-800/20 transition-colors">
                                            <span className="text-[10px] text-slate-700 w-4 shrink-0 tabular-nums text-center">{idx + 1}</span>
                                            <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                                              {homeWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                              <span className={`text-sm font-medium text-right truncate ${homeWon ? 'text-green-400' : awayWon ? 'text-slate-500' : 'text-slate-200'}`}>
                                                {m.homePlayer?.fullName}
                                              </span>
                                            </div>
                                            <div className="w-14 text-center shrink-0">
                                              {completed ? (
                                                <span className={`text-sm font-bold tabular-nums px-1.5 py-0.5 rounded ${isDraw ? 'text-yellow-400' : homeWon ? 'text-green-400' : 'text-red-400'}`}>
                                                  {m.homeSets}:{m.awaySets}
                                                </span>
                                              ) : (
                                                <span className="text-xs text-slate-600 font-medium">vs</span>
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-center gap-1 min-w-0">
                                              {awayWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                              <span className={`text-sm font-medium truncate ${awayWon ? 'text-green-400' : homeWon ? 'text-slate-500' : 'text-slate-200'}`}>
                                                {m.awayPlayer?.fullName}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                              {canEdit && completed && !m.isWalkover && (
                                                <button
                                                  onClick={() => { setPhaseMatchModal(m); setPhaseHomeScore(m.homeSets ?? 0); setPhaseAwayScore(m.awaySets ?? 0); }}
                                                  className="text-[11px] px-2 py-1 text-slate-600 hover:text-slate-300 rounded-lg transition-colors">
                                                  Ispravi
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="px-4 py-4 text-center text-xs text-slate-500">Nema mečeva za ovu sesiju.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}


            {/* ── IGRAČI ── */}
            {phaseTab === 'igraci' && (() => {
              const sortedByPhase = [...lPlayers]
                .sort((a: any, b: any) => {
                  if (playerSort === 'name') return (a.player?.fullName ?? '').localeCompare(b.player?.fullName ?? '');
                  const sa = phaseStandings.find((s: any) => s.playerId === a.playerId);
                  const sb = phaseStandings.find((s: any) => s.playerId === b.playerId);
                  return (sb?.points ?? -1) - (sa?.points ?? -1);
                });
              const filtered = sortedByPhase.filter((lp: any) =>
                lp.player?.fullName?.toLowerCase().includes(playerSearch.toLowerCase())
              );
              return (
                <div className="animate-fade-in-up space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 shrink-0">
                      <h3 className="font-bold text-white text-base">Igrači</h3>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded-full tabular-nums">{lPlayers.length}</span>
                    </div>
                    <div className="flex items-center gap-2 input-field px-2.5 py-2 flex-1 min-w-0">
                      <Search className="w-3.5 h-3.5 text-orange-400/60 shrink-0" />
                      <input type="text" value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)}
                        placeholder="Pretraži..." className="flex-1 bg-transparent text-sm outline-none text-white placeholder-slate-500 min-w-0" />
                      {playerSearch && (
                        <button onClick={() => setPlayerSearch('')} className="text-slate-500 hover:text-white transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sort bar */}
                  <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5 w-fit">
                    {(['points', 'name'] as const).map((s) => (
                      <button key={s} onClick={() => setPlayerSort(s)}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${playerSort === s ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        {s === 'points' ? 'Bodovi' : 'Ime A–Ž'}
                      </button>
                    ))}
                  </div>

                  {/* Grid */}
                  {lPlayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-slate-600" />
                      </div>
                      <p className="text-white font-medium mb-1.5">Nema igrača</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Search className="w-6 h-6 text-slate-600 mb-2" />
                      <p className="text-sm text-slate-400">Nema rezultata za "{playerSearch}"</p>
                      <button onClick={() => setPlayerSearch('')} className="text-xs text-orange-400 hover:text-orange-300 mt-1.5 transition-colors">Poništi pretragu</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filtered.map((lp: any, idx: number) => {
                        const standing = phaseStandings.find((s: any) => s.playerId === lp.playerId);
                        return (
                          <div key={lp.id} style={{ animationDelay: `${idx * 30}ms` }}
                            className="card p-4 flex flex-col items-center text-center gap-2.5 cursor-pointer transition-all duration-150 hover:bg-slate-800/60 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
                            onClick={() => setSelectedPlayer(lp)}
                          >
                            <Avatar name={lp.player?.fullName} player={lp.player} size="lg" />
                            <div className="w-full min-w-0">
                              <p className="text-sm font-semibold text-white leading-tight truncate">{lp.player?.fullName}</p>
                              {standing ? (
                                <p className="text-xs text-slate-400 mt-1">
                                  <span className="text-orange-400 font-bold">{standing.points}</span> bod.
                                  <span className="mx-1.5 text-slate-600">·</span>
                                  {standing.played} meč.
                                </p>
                              ) : (
                                <p className="text-xs text-slate-600 mt-1">Bez mečeva</p>
                              )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedPlayer(lp); }}
                              className="w-full text-xs text-slate-400 hover:text-orange-400 font-medium py-1.5 rounded-lg hover:bg-orange-500/10 transition-all">
                              Detalji →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── MATRICA (round-robin phases only) ── */}
            {!phaseLoading && !isPlayoff && phaseTab === 'matrica' && (() => {
              /* Players sorted by phase standings position */
              const sortedPlayers = phaseStandings.map((s: any) => ({ playerId: s.playerId, player: s.player }));
              // All non-playoff phases use home/away double round-robin → 2 matches per pair
              const expectedPerPair = 2;

              const getCellData = (aId: string, bId: string) => {
                if (aId === bId) return null;
                const between = phaseFixtures.filter(
                  (m: any) =>
                    (m.homePlayerId === aId && m.awayPlayerId === bId) ||
                    (m.homePlayerId === bId && m.awayPlayerId === aId),
                );
                const completed = between.filter((m: any) => m.status === 'completed' || m.status === 'walkover');
                let status: 'not_played' | 'partial' | 'completed' | 'upcoming';
                if (between.length === 0)                          status = 'not_played';
                else if (completed.length === 0)                   status = 'upcoming';
                else if (completed.length >= expectedPerPair)      status = 'completed';
                else                                               status = 'partial';
                return { between, completed, status };
              };

              const allPairs: { aId: string; bId: string }[] = [];
              for (let i = 0; i < sortedPlayers.length; i++)
                for (let j = i + 1; j < sortedPlayers.length; j++)
                  allPairs.push({ aId: sortedPlayers[i].playerId, bId: sortedPlayers[j].playerId });

              const pairStats = {
                completed:  allPairs.filter(p => getCellData(p.aId, p.bId)?.status === 'completed').length,
                partial:    allPairs.filter(p => getCellData(p.aId, p.bId)?.status === 'partial').length,
                not_played: allPairs.filter(p => getCellData(p.aId, p.bId)?.status === 'not_played').length,
                upcoming:   allPairs.filter(p => getCellData(p.aId, p.bId)?.status === 'upcoming').length,
                total:      allPairs.length,
              };

              const getCellOpacity = (aId: string, bId: string, status: string) => {
                const inSpotlight = matrixHighlight === aId || matrixHighlight === bId;
                const filterMatch = matrixFilter === 'all' || status === matrixFilter;
                if (matrixHighlight && matrixFilter !== 'all') return (inSpotlight && filterMatch) ? 1 : 0.15;
                if (matrixHighlight) return inSpotlight ? 1 : 0.2;
                if (matrixFilter !== 'all') return filterMatch ? 1 : 0.18;
                return 1;
              };

              const CellBox = ({ aId, bId }: { aId: string; bId: string }) => {
                if (aId === bId) {
                  const isDimmed = matrixHighlight !== null || matrixFilter !== 'all';
                  return (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-opacity duration-200"
                      style={{ backgroundColor: 'var(--bg-secondary)', opacity: isDimmed ? 0.12 : 0.5 }}>
                      <span className="text-slate-600 text-[10px]">—</span>
                    </div>
                  );
                }
                const cell = getCellData(aId, bId);
                if (!cell) return null;
                const opacity = getCellOpacity(aId, bId, cell.status);
                const inSpotlight = matrixHighlight === aId || matrixHighlight === bId;
                let bg = '', border = '', label = '';
                if (cell.status === 'not_played')      { bg = 'rgba(15,23,42,0.7)';       border = '1px dashed rgba(71,85,105,0.55)'; label = ''; }
                else if (cell.status === 'upcoming')   { bg = 'rgba(99,102,241,0.12)';    border = '1px solid rgba(99,102,241,0.28)'; label = '⏳'; }
                else if (cell.status === 'partial')    { bg = 'rgba(245,158,11,0.14)';    border = '1px solid rgba(245,158,11,0.32)'; label = `${cell.completed.length}/${expectedPerPair}`; }
                else                                   { bg = 'rgba(34,197,94,0.14)';     border = '1px solid rgba(34,197,94,0.3)';  label = '✓'; }
                const aName = sortedPlayers.find((p: any) => p.playerId === aId)?.player?.fullName || '';
                const bName = sortedPlayers.find((p: any) => p.playerId === bId)?.player?.fullName || '';
                const tipMap: Record<string, string> = { not_played: 'Nije odigrano', upcoming: 'Zakazano', partial: 'Delimično', completed: 'Završeno' };
                return (
                  <button onClick={() => setMatrixCell({ aId, bId })} title={`${aName} vs ${bName} · ${tipMap[cell.status]}`}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150 hover:brightness-125 hover:scale-110 active:scale-95 ${
                      cell.status === 'completed' ? 'text-emerald-400 text-xs font-bold' :
                      cell.status === 'partial'   ? 'text-amber-400 text-[10px] font-bold' :
                      cell.status === 'upcoming'  ? 'text-indigo-400 text-[10px]' : 'text-slate-700 text-xs'
                    }`}
                    style={{ backgroundColor: bg, border: inSpotlight ? '1.5px solid rgba(249,115,22,0.55)' : border, opacity }}>
                    {label}
                  </button>
                );
              };

              /* modal */
              const cellModal = matrixCell ? (() => {
                const { aId, bId } = matrixCell;
                const aPlayer = sortedPlayers.find((p: any) => p.playerId === aId);
                const bPlayer = sortedPlayers.find((p: any) => p.playerId === bId);
                const cell = getCellData(aId, bId);
                if (!cell) return null;
                const aName = aPlayer?.player?.fullName || '?';
                const bName = bPlayer?.player?.fullName || '?';
                const accent =
                  cell.status === 'completed' ? { bg: 'rgba(34,197,94,0.09)',  border: 'rgba(34,197,94,0.22)',  text: '#4ade80' } :
                  cell.status === 'partial'   ? { bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.24)', text: '#fbbf24' } :
                  cell.status === 'upcoming'  ? { bg: 'rgba(99,102,241,0.09)', border: 'rgba(99,102,241,0.22)', text: '#818cf8' } :
                                                { bg: 'rgba(51,65,85,0.35)',   border: 'rgba(71,85,105,0.4)',   text: '#94a3b8' };
                const statusLabel =
                  cell.status === 'completed' ? `✓ Završeno · ${cell.completed.length}/${expectedPerPair}` :
                  cell.status === 'partial'   ? `${cell.completed.length} / ${expectedPerPair} odigrano` :
                  cell.status === 'upcoming'  ? 'Na čekanju' : 'Nije odigrano';
                const MatchRow = ({ m }: { m: any }) => {
                  const done = m.status === 'completed' || m.status === 'walkover';
                  const aIsHome = m.homePlayerId === aId;
                  const homeN = aIsHome ? aName : bName;
                  const awayN = aIsHome ? bName : aName;
                  const aScore = aIsHome ? m.homeSets : m.awaySets;
                  const bScore = aIsHome ? m.awaySets : m.homeSets;
                  const aWon = done && aScore > bScore;
                  const bWon = done && bScore > aScore;
                  return (
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">R{m.roundNumber || 1}</span>
                        {done && <span className={`badge text-[10px] ${aWon ? 'badge-win' : bWon ? 'badge-loss' : 'badge-draw'}`}>{aWon ? 'Pobeda A' : bWon ? 'Pobeda B' : 'Remi'}</span>}
                      </div>
                      <div className="flex items-center gap-2 px-3 pb-3">
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316' }}>DOM</span>
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{homeN}</span>
                        </div>
                        <div className="shrink-0 text-center min-w-[52px]">
                          {done ? <span className="font-mono font-bold text-base tabular-nums" style={{ color: 'var(--text-primary)' }}>{m.homeSets} : {m.awaySets}</span>
                                : <span className="text-xs font-medium text-slate-500">vs</span>}
                        </div>
                        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate text-right" style={{ color: 'var(--text-primary)' }}>{awayN}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>GOS</span>
                        </div>
                      </div>
                    </div>
                  );
                };
                return (
                  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setMatrixCell(null)}>
                    <div className="card w-full max-w-md animate-scale-in rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex justify-end mb-3">
                          <button onClick={() => setMatrixCell(null)} className="p-1.5 rounded-xl hover:bg-slate-700 transition-colors" style={{ color: 'var(--text-secondary)' }}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                            <Avatar name={aName} player={aPlayer?.player} size="lg" />
                            <span className="text-sm font-bold text-center truncate w-full" style={{ color: 'var(--text-primary)' }}>{aName}</span>
                          </div>
                          <div className="flex flex-col items-center gap-2 shrink-0">
                            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>vs</span>
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: accent.bg, border: `1px solid ${accent.border}`, color: accent.text }}>{statusLabel}</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                            <Avatar name={bName} player={bPlayer?.player} size="lg" />
                            <span className="text-sm font-bold text-center truncate w-full" style={{ color: 'var(--text-primary)' }}>{bName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-5 py-4 space-y-3">
                        {cell.status === 'not_played' && <p className="text-center text-sm py-2" style={{ color: 'var(--text-secondary)' }}>Ovaj par još nije igrao.</p>}
                        {cell.between.map((m: any) => <MatchRow key={m.id} m={m} />)}
                        {(cell.status === 'not_played' || cell.status === 'upcoming' || cell.status === 'partial') && canEdit && (
                          <button onClick={() => { setMatrixCell(null); setPhaseTab('raspored'); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110 mt-1"
                            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            {cell.status === 'not_played' || cell.status === 'upcoming' ? 'Idi na Raspored' : 'Unesi rezultat'}
                            <ChevronRight className="w-4 h-4 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })() : null;

              const mobilePlayerId = matrixMobilePlayer || (sortedPlayers[0]?.playerId ?? '');
              const mobileOpponents = sortedPlayers
                .filter((p: any) => p.playerId !== mobilePlayerId)
                .map((p: any) => ({ lp: p, cell: getCellData(mobilePlayerId, p.playerId) }))
                .sort((a, b) => {
                  const order: Record<string, number> = { not_played: 0, partial: 1, upcoming: 2, completed: 3 };
                  return (order[a.cell?.status ?? 'not_played'] ?? 0) - (order[b.cell?.status ?? 'not_played'] ?? 0);
                });

              if (sortedPlayers.length < 2) {
                return (<div className="animate-fade-in-up"><EmptyState icon={<Grid3x3 className="w-6 h-6" />} title="Nema dovoljno igrača" desc="Nema igrača u ovoj fazi" small />{cellModal}</div>);
              }

              const legendItems = [
                { id: 'completed' as const, label: 'Završeno',  dotBg: 'rgba(34,197,94,0.4)',   dotBorder: 'rgba(34,197,94,0.6)',   count: pairStats.completed },
                { id: 'upcoming'  as const, label: 'Zakazano',  dotBg: 'rgba(99,102,241,0.35)', dotBorder: 'rgba(99,102,241,0.6)', count: pairStats.upcoming  },
                { id: 'partial'   as const, label: 'Delimično', dotBg: 'rgba(245,158,11,0.4)',  dotBorder: 'rgba(245,158,11,0.6)', count: pairStats.partial   },
                { id: 'not_played' as const, label: 'Nije',     dotBg: 'rgba(51,65,85,0.6)',    dotBorder: 'rgba(71,85,105,0.5)',  count: pairStats.not_played },
              ];
              const anyActive = matrixFilter !== 'all' || matrixHighlight !== null;

              return (
                <div className="animate-fade-in-up space-y-4">
                  {/* Mobile legend filter */}
                  <div className="flex gap-2 items-center overflow-x-auto pb-1 md:hidden" style={{ scrollbarWidth: 'none' }}>
                    {legendItems.map(item => {
                      const active = matrixFilter === item.id;
                      return (
                        <button key={item.id} onClick={() => setMatrixFilter(active ? 'all' : item.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0"
                          style={{ backgroundColor: active ? 'rgba(71,85,105,0.55)' : 'var(--bg-secondary)', border: active ? '1px solid rgba(100,116,139,0.7)' : '1px solid var(--border)', color: active ? '#f1f5f9' : 'var(--text-secondary)', opacity: matrixFilter !== 'all' && !active ? 0.55 : 1 }}>
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.dotBg, border: `1px solid ${item.dotBorder}` }} />
                          {item.label}
                          {item.count > 0 && <span className="text-[10px] opacity-70">{item.count}</span>}
                        </button>
                      );
                    })}
                    {anyActive && (
                      <button onClick={() => { setMatrixFilter('all'); setMatrixHighlight(null); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:text-white shrink-0"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        <X className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </div>

                  {/* Desktop card */}
                  <div className="card hidden md:block overflow-hidden">
                    <div className="px-5 pt-4 pb-3 flex flex-wrap gap-2 items-center" style={{ borderBottom: '1px solid var(--border)' }}>
                      {legendItems.map(item => {
                        const active = matrixFilter === item.id;
                        return (
                          <button key={`dl-${item.id}`} onClick={() => setMatrixFilter(active ? 'all' : item.id)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                            style={{ backgroundColor: active ? 'rgba(71,85,105,0.55)' : 'var(--bg-secondary)', border: active ? '1px solid rgba(100,116,139,0.7)' : '1px solid var(--border)', color: active ? '#f1f5f9' : 'var(--text-secondary)', opacity: matrixFilter !== 'all' && !active ? 0.55 : 1 }}>
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.dotBg, border: `1px solid ${item.dotBorder}` }} />
                            {item.label}
                            {item.count > 0 && <span className="text-[10px] opacity-70">{item.count}</span>}
                          </button>
                        );
                      })}
                      {anyActive && (
                        <button onClick={() => { setMatrixFilter('all'); setMatrixHighlight(null); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:text-white"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          <X className="w-3 h-3" /> Reset
                        </button>
                      )}
                    </div>
                    {/* Column headers */}
                    <div className="px-5 pt-4 overflow-x-auto pb-4">
                      <div className="flex items-end gap-1 mb-1.5" style={{ paddingLeft: '10rem' }}>
                        {sortedPlayers.map((lp: any) => {
                          const isCol = matrixHighlight === lp.playerId;
                          return (
                            <button key={lp.playerId} onClick={() => setMatrixHighlight(matrixHighlight === lp.playerId ? null : lp.playerId)}
                              className="w-10 flex flex-col items-center transition-all duration-200 hover:opacity-100"
                              style={{ opacity: matrixHighlight && !isCol ? 0.3 : isCol ? 1 : 0.75 }}
                              title={lp.player?.fullName}>
                              <Avatar name={lp.player?.fullName} player={lp.player} size="sm" />
                            </button>
                          );
                        })}
                      </div>
                      {/* Rows */}
                      {sortedPlayers.map((rowPlayer: any) => {
                        const rowName = rowPlayer.player?.fullName || rowPlayer.playerId;
                        const isRowHL = matrixHighlight === rowPlayer.playerId;
                        const labelDim = matrixHighlight && !isRowHL;
                        return (
                          <div key={rowPlayer.playerId} className="flex items-center gap-1 mb-1">
                            <button onClick={() => setMatrixHighlight(matrixHighlight === rowPlayer.playerId ? null : rowPlayer.playerId)}
                              className="flex items-center gap-2 shrink-0 text-left pr-2 transition-all hover:opacity-100"
                              style={{ width: '10rem', opacity: labelDim ? 0.28 : 1 }}>
                              <Avatar name={rowName} player={rowPlayer.player} size="sm" />
                              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{rowName}</span>
                            </button>
                            {sortedPlayers.map((colPlayer: any) => (
                              <CellBox key={colPlayer.playerId} aId={rowPlayer.playerId} bId={colPlayer.playerId} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile: player focus */}
                  <div className="md:hidden space-y-3">
                    <div className="relative">
                      <select value={mobilePlayerId} onChange={e => setMatrixMobilePlayer(e.target.value)} className="input-field w-full pr-8 appearance-none">
                        {sortedPlayers.map((p: any) => (
                          <option key={p.playerId} value={p.playerId}>{p.player?.fullName || p.playerId}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div className="space-y-2">
                      {mobileOpponents.map(({ lp, cell }) => {
                        if (!cell) return null;
                        const statusColor = cell.status === 'completed' ? '#4ade80' : cell.status === 'upcoming' ? '#818cf8' : cell.status === 'partial' ? '#fbbf24' : '#475569';
                        const statusLabel = cell.status === 'completed' ? 'Završeno' : cell.status === 'upcoming' ? 'Zakazano' : cell.status === 'partial' ? 'Delimično' : 'Nije';
                        return (
                          <button key={lp.playerId} onClick={() => setMatrixCell({ aId: mobilePlayerId, bId: lp.playerId })}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98] hover:brightness-110"
                            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <Avatar name={lp.player?.fullName} player={lp.player} size="sm" />
                            <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{lp.player?.fullName}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: statusColor, backgroundColor: `${statusColor}18`, border: `1px solid ${statusColor}40` }}>{statusLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats footer */}
                  <div className="flex items-center gap-4 px-1">
                    {[
                      { label: 'Završeno',  value: pairStats.completed,  color: 'text-emerald-400' },
                      { label: 'Nije',      value: pairStats.not_played, color: 'text-slate-400'   },
                      { label: 'Ukupno',    value: pairStats.total,      color: 'text-white'       },
                    ].map(s => (
                      <div key={s.label} className="flex items-baseline gap-1.5">
                        <span className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {cellModal}
                </div>
              );
            })()}

            {/* ── PLAYOFF BRACKET ── */}
            {!phaseLoading && isPlayoff && phaseTab === 'bracket' && (
              <div className="animate-fade-in-up space-y-6">

                {/* Desktop bracket */}
                <div className="hidden md:block">
                  <div className="max-w-3xl mx-auto px-6 py-4 space-y-6">

                    {/* Semifinal row */}
                    <div className="grid grid-cols-2 gap-8">
                      <PlayoffCard match={sf1} label="Polufinale 1" />
                      <PlayoffCard match={sf2} label="Polufinale 2" />
                    </div>

                    {/* Connector lines → Final */}
                    <div className="relative h-8">
                      <div className="absolute left-1/4 right-1/4 top-0 h-px" style={{ backgroundColor: 'var(--border)' }} />
                      <div className="absolute left-1/4 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--border)' }} />
                      <div className="absolute right-1/4 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--border)' }} />
                      <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-px" style={{ backgroundColor: 'var(--border)' }} />
                    </div>

                    {/* Final */}
                    <div className="max-w-sm mx-auto">
                      <PlayoffCard match={final} label="🏆 Finale" />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Meč za 3. mesto</span>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                    </div>

                    {/* Third-place match */}
                    <div className="max-w-sm mx-auto">
                      <PlayoffCard match={thirdPlace} label="🥉 3. Mesto" />
                    </div>
                  </div>
                </div>

                {/* Mobile: stacked */}
                <div className="md:hidden space-y-4">
                  <PlayoffCard match={sf1} label="Polufinale 1" />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                  </div>
                  <PlayoffCard match={sf2} label="Polufinale 2" />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                  </div>
                  <PlayoffCard match={final} label="🏆 Finale" />
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">3. mesto</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                  </div>
                  <PlayoffCard match={thirdPlace} label="🥉 3. Mesto" />
                </div>

              </div>
            )}

          </div>
        );
          })()}
        </div>
      )}

      {/* ══════════════════ MATRICA ══════════════════════════════ */}
      {tab === 'matrica' && !isEuroleague && (() => {
        const expectedPerPair = league.format === 'home_away' ? 2 : 1;

        /* ── sort by standing position ── */
        const sortedPlayers = [...lPlayers].sort((a: any, b: any) => {
          const aPos = standings.findIndex((s: any) => s.playerId === a.playerId);
          const bPos = standings.findIndex((s: any) => s.playerId === b.playerId);
          const aOrd = aPos === -1 ? 999 : aPos;
          const bOrd = bPos === -1 ? 999 : bPos;
          if (aOrd !== bOrd) return aOrd - bOrd;
          return (a.player?.fullName || '').localeCompare(b.player?.fullName || '');
        });

        /* ── cell data helper ── */
        const getCellData = (aId: string, bId: string) => {
          if (aId === bId) return null;
          const between = fixtures.filter(
            (m: any) =>
              (m.homePlayerId === aId && m.awayPlayerId === bId) ||
              (m.homePlayerId === bId && m.awayPlayerId === aId),
          );
          const completed = between.filter((m: any) => m.status === 'completed' || m.status === 'walkover');
          let status: 'not_played' | 'partial' | 'completed' | 'upcoming';
          if (between.length === 0)                     status = 'not_played';
          else if (completed.length === 0)              status = 'upcoming';
          else if (completed.length >= expectedPerPair) status = 'completed';
          else                                          status = 'partial';
          return { between, completed, status };
        };

        /* ── pre-compute pair stats ── */
        const allPairs: { aId: string; bId: string }[] = [];
        for (let i = 0; i < sortedPlayers.length; i++)
          for (let j = i + 1; j < sortedPlayers.length; j++)
            allPairs.push({ aId: sortedPlayers[i].playerId, bId: sortedPlayers[j].playerId });

        const pairStats = {
          completed:  allPairs.filter(p => getCellData(p.aId, p.bId)?.status === 'completed').length,
          partial:    allPairs.filter(p => getCellData(p.aId, p.bId)?.status === 'partial').length,
          not_played: allPairs.filter(p => getCellData(p.aId, p.bId)?.status === 'not_played').length,
          upcoming:   allPairs.filter(p => getCellData(p.aId, p.bId)?.status === 'upcoming').length,
          total:      allPairs.length,
        };

        /* ── opacity helper (spotlight + legend filter) ── */
        const getCellOpacity = (aId: string, bId: string, status: string) => {
          const inSpotlight  = matrixHighlight === aId || matrixHighlight === bId;
          const filterMatch  = matrixFilter === 'all' || status === matrixFilter;
          if (matrixHighlight && matrixFilter !== 'all') return (inSpotlight && filterMatch) ? 1 : 0.15;
          if (matrixHighlight) return inSpotlight  ? 1 : 0.2;
          if (matrixFilter !== 'all') return filterMatch ? 1 : 0.18;
          return 1;
        };

        /* ── cell component ── */
        const CellBox = ({ aId, bId }: { aId: string; bId: string }) => {
          if (aId === bId) {
            const isDimmed = matrixHighlight !== null || matrixFilter !== 'all';
            return (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-opacity duration-200"
                style={{ backgroundColor: 'var(--bg-secondary)', opacity: isDimmed ? 0.12 : 0.5 }}
              >
                <span className="text-slate-600 text-[10px]">—</span>
              </div>
            );
          }
          const cell = getCellData(aId, bId);
          if (!cell) return null;

          const opacity      = getCellOpacity(aId, bId, cell.status);
          const inSpotlight  = matrixHighlight === aId || matrixHighlight === bId;

          /* visual per status */
          let bg = '', border = '', label = '';
          if (cell.status === 'not_played') {
            bg = 'rgba(15,23,42,0.7)'; border = '1px dashed rgba(71,85,105,0.55)'; label = '';
          } else if (cell.status === 'upcoming') {
            bg = 'rgba(99,102,241,0.12)'; border = '1px solid rgba(99,102,241,0.28)'; label = '⏳';
          } else if (cell.status === 'partial') {
            bg = 'rgba(245,158,11,0.14)'; border = '1px solid rgba(245,158,11,0.32)';
            label = `${cell.completed.length}/${expectedPerPair}`;
          } else {
            bg = 'rgba(34,197,94,0.14)'; border = '1px solid rgba(34,197,94,0.3)'; label = '✓';
          }

          const aName = sortedPlayers.find((p: any) => p.playerId === aId)?.player?.fullName || '';
          const bName = sortedPlayers.find((p: any) => p.playerId === bId)?.player?.fullName || '';
          const tipMap: Record<string, string> = {
            not_played: 'Nije odigrano', upcoming: 'Zakazano',
            partial: `${cell.completed.length}/${expectedPerPair} odigrano`, completed: 'Završeno',
          };

          return (
            <button
              onClick={() => setMatrixCell({ aId, bId })}
              title={`${aName} vs ${bName} · ${tipMap[cell.status]}`}
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150 hover:brightness-125 hover:scale-110 active:scale-95 ${
                cell.status === 'completed'  ? 'text-emerald-400 text-xs font-bold' :
                cell.status === 'partial'    ? 'text-amber-400 text-[10px] font-bold' :
                cell.status === 'upcoming'   ? 'text-indigo-400 text-[10px]' :
                                               'text-slate-700 text-xs'
              }`}
              style={{
                backgroundColor: bg,
                border: inSpotlight ? '1.5px solid rgba(249,115,22,0.55)' : border,
                opacity,
              }}
            >
              {label}
            </button>
          );
        };

        /* ── modal ── */
        const cellModal = matrixCell ? (() => {
          const { aId, bId } = matrixCell;
          const aPlayer = sortedPlayers.find((p: any) => p.playerId === aId);
          const bPlayer = sortedPlayers.find((p: any) => p.playerId === bId);
          const cell = getCellData(aId, bId);
          if (!cell) return null;

          const aName = aPlayer?.player?.fullName || '?';
          const bName = bPlayer?.player?.fullName || '?';

          /* detect missing leg */
          const hasHomeCompleted = cell.between.some(
            (m: any) => m.homePlayerId === aId && (m.status === 'completed' || m.status === 'walkover'),
          );
          const hasAwayCompleted = cell.between.some(
            (m: any) => m.homePlayerId === bId && (m.status === 'completed' || m.status === 'walkover'),
          );
          const missingLeg = expectedPerPair === 2
            ? (!hasHomeCompleted && !hasAwayCompleted ? 'oba meča'
               : !hasHomeCompleted ? `${aName} kao domaćin`
               : `${bName} kao domaćin`)
            : null;

          /* status accent colours */
          const accent =
            cell.status === 'completed' ? { bg: 'rgba(34,197,94,0.09)',  border: 'rgba(34,197,94,0.22)',  text: '#4ade80' } :
            cell.status === 'partial'   ? { bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.24)', text: '#fbbf24' } :
            cell.status === 'upcoming'  ? { bg: 'rgba(99,102,241,0.09)', border: 'rgba(99,102,241,0.22)', text: '#818cf8' } :
                                          { bg: 'rgba(51,65,85,0.35)',   border: 'rgba(71,85,105,0.4)',   text: '#94a3b8' };

          const statusLabel =
            cell.status === 'completed' ? `✓ Završeno · ${cell.completed.length}/${expectedPerPair}` :
            cell.status === 'partial'   ? `${cell.completed.length} / ${expectedPerPair} odigrano` :
            cell.status === 'upcoming'  ? `${cell.between.length} meč(eva) na čekanju` :
                                          'Nije odigrano';

          /* shared match row renderer */
          const MatchRow = ({ m }: { m: any }) => {
            const done    = m.status === 'completed' || m.status === 'walkover';
            const aIsHome = m.homePlayerId === aId;
            const homeN   = aIsHome ? aName : bName;
            const awayN   = aIsHome ? bName : aName;
            const aScore  = aIsHome ? m.homeSets : m.awaySets;
            const bScore  = aIsHome ? m.awaySets : m.homeSets;
            const aWon    = done && aScore > bScore;
            const bWon    = done && bScore > aScore;
            const rnd     = m.roundNumber > 0 ? `R${m.roundNumber}` : '—';

            return (
              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                {/* round label */}
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{rnd}</span>
                  {done && (
                    <span className={`badge text-[10px] ${aWon ? 'badge-win' : bWon ? 'badge-loss' : 'badge-draw'}`}>
                      {aWon ? 'Pobeda A' : bWon ? 'Pobeda B' : 'Remi'}
                    </span>
                  )}
                  {!done && m.scheduledDate && (
                    <span className="text-[10px] text-slate-500">
                      {new Date(m.scheduledDate).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* match layout: Home | score | Away */}
                <div className="flex items-center gap-2 px-3 pb-3">
                  {/* Home */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316' }}
                    >
                      DOM
                    </span>
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {homeN}
                    </span>
                  </div>

                  {/* Score / pending */}
                  <div className="shrink-0 text-center min-w-[52px]">
                    {done ? (
                      <span className="font-mono font-bold text-base tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {m.homeSets} : {m.awaySets}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">vs</span>
                    )}
                  </div>

                  {/* Away */}
                  <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                    <span className="text-sm font-semibold truncate text-right" style={{ color: 'var(--text-primary)' }}>
                      {awayN}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                    >
                      GOS
                    </span>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in"
              onClick={() => setMatrixCell(null)}
            >
              <div
                className="card w-full max-w-md animate-scale-in rounded-2xl max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* ── Header ── */}
                <div
                  className="px-5 pt-5 pb-4"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {/* Close */}
                  <div className="flex justify-end mb-3">
                    <button
                      onClick={() => setMatrixCell(null)}
                      className="p-1.5 rounded-xl hover:bg-slate-700 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Players — symmetric layout */}
                  <div className="flex items-center gap-3">
                    {/* Player A */}
                    <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <Avatar name={aName} player={aPlayer?.player} size="lg" />
                      <span className="text-sm font-bold text-center truncate w-full" style={{ color: 'var(--text-primary)' }}>
                        {aName}
                      </span>
                    </div>

                    {/* VS + status pill */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <span
                        className="text-[11px] font-black uppercase tracking-widest"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        vs
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: accent.bg, border: `1px solid ${accent.border}`, color: accent.text }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* Player B */}
                    <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <Avatar name={bName} player={bPlayer?.player} size="lg" />
                      <span className="text-sm font-bold text-center truncate w-full" style={{ color: 'var(--text-primary)' }}>
                        {bName}
                      </span>
                    </div>
                  </div>

                  {/* Missing leg note (partial only) */}
                  {cell.status === 'partial' && missingLeg && (
                    <p className="text-center text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                      Nedostaje: <span className="font-semibold" style={{ color: accent.text }}>{missingLeg}</span>
                    </p>
                  )}
                </div>

                {/* ── Body ── */}
                <div className="px-5 py-4 space-y-3">

                  {/* NOT PLAYED */}
                  {cell.status === 'not_played' && (
                    <p className="text-center text-sm py-2" style={{ color: 'var(--text-secondary)' }}>
                      Ovaj par još nije igrao.
                    </p>
                  )}

                  {/* Match rows */}
                  {cell.between.length > 0 && cell.between.map((m: any) => (
                    <MatchRow key={m.id} m={m} />
                  ))}

                  {/* CTA */}
                  {(cell.status === 'not_played' || cell.status === 'upcoming' || cell.status === 'partial') && canEdit && (
                    <button
                      onClick={() => { setMatrixCell(null); setTab('raspored'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110 mt-1"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {cell.status === 'not_played' || cell.status === 'upcoming'
                        ? 'Idi na Raspored'
                        : 'Unesi rezultat'}
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })() : null;

        /* ── mobile: player focus list ── */
        const mobilePlayerId = matrixMobilePlayer || (sortedPlayers[0]?.playerId ?? '');
        const mobileOpponents = sortedPlayers
          .filter((p: any) => p.playerId !== mobilePlayerId)
          .map((p: any) => ({ lp: p, cell: getCellData(mobilePlayerId, p.playerId) }))
          .sort((a, b) => {
            const order: Record<string, number> = { not_played: 0, partial: 1, upcoming: 2, completed: 3 };
            return (order[a.cell?.status ?? 'not_played'] ?? 0) - (order[b.cell?.status ?? 'not_played'] ?? 0);
          });

        /* ── empty guard ── */
        if (lPlayers.length < 2) {
          return (
            <div className="animate-fade-in-up">
              <EmptyState icon={<Grid3x3 className="w-6 h-6" />} title="Nema dovoljno igrača" desc="Dodaj barem 2 igrača da vidiš matricu" small />
              {cellModal}
            </div>
          );
        }

        /* ── legend config ── */
        const legendItems = [
          { id: 'completed'  as const, label: 'Završeno',  dotBg: 'rgba(34,197,94,0.25)',  dotBorder: 'rgba(34,197,94,0.4)',  count: pairStats.completed  },
          { id: 'partial'    as const, label: 'Delimično', dotBg: 'rgba(245,158,11,0.25)', dotBorder: 'rgba(245,158,11,0.4)', count: pairStats.partial    },
          { id: 'upcoming'   as const, label: 'Zakazano',  dotBg: 'rgba(99,102,241,0.25)', dotBorder: 'rgba(99,102,241,0.4)', count: pairStats.upcoming   },
          { id: 'not_played' as const, label: 'Nije',      dotBg: 'rgba(51,65,85,0.6)',    dotBorder: 'rgba(71,85,105,0.5)', count: pairStats.not_played },
        ];

        const anyActive = matrixFilter !== 'all' || matrixHighlight !== null;

        return (
          <div className="animate-fade-in-up space-y-4">

            {/* Interactive legend / filter — mobile only (desktop legend lives inside the grid card) */}
            <div className="relative md:hidden">
              {/* Right fade — scroll hint on mobile */}
              <div
                className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10 md:hidden"
                style={{ background: 'linear-gradient(to left, var(--bg-primary), transparent)' }}
              />
            <div className="flex gap-2 items-center overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0" style={{ scrollbarWidth: 'none' }}>
              {legendItems.map(item => {
                const active = matrixFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMatrixFilter(active ? 'all' : item.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0"
                    style={{
                      backgroundColor: active ? 'rgba(71,85,105,0.55)' : 'var(--bg-secondary)',
                      border: active ? '1px solid rgba(100,116,139,0.7)' : '1px solid var(--border)',
                      color: active ? '#f1f5f9' : 'var(--text-secondary)',
                      opacity: matrixFilter !== 'all' && !active ? 0.55 : 1,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.dotBg, border: `1px solid ${item.dotBorder}` }}
                    />
                    {item.label}
                    <span className="tabular-nums" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
              {anyActive && (
                <button
                  onClick={() => { setMatrixFilter('all'); setMatrixHighlight(null); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:text-white shrink-0"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <X className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
            </div>{/* end relative wrapper */}

            {/* ── DESKTOP: full grid ── */}
            <div className="hidden md:block">
              <div className="card">
                {/* Legend chips inside card — desktop */}
                <div className="px-5 pt-4 pb-3 flex flex-wrap gap-2 items-center" style={{ borderBottom: '1px solid var(--border)' }}>
                  {legendItems.map(item => {
                    const active = matrixFilter === item.id;
                    return (
                      <button
                        key={`dl-${item.id}`}
                        onClick={() => setMatrixFilter(active ? 'all' : item.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={{
                          backgroundColor: active ? 'rgba(71,85,105,0.55)' : 'var(--bg-secondary)',
                          border: active ? '1px solid rgba(100,116,139,0.7)' : '1px solid var(--border)',
                          color: active ? '#f1f5f9' : 'var(--text-secondary)',
                          opacity: matrixFilter !== 'all' && !active ? 0.55 : 1,
                        }}
                      >
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.dotBg, border: `1px solid ${item.dotBorder}` }} />
                        {item.label}
                        <span className="tabular-nums" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>{item.count}</span>
                      </button>
                    );
                  })}
                  {anyActive && (
                    <button
                      onClick={() => { setMatrixFilter('all'); setMatrixHighlight(null); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:text-white"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      <X className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                <div className="min-w-max px-5 py-4">
                  {/* Column headers */}
                  <div className="flex items-end gap-1 mb-1.5" style={{ paddingLeft: '10rem' }}>
                    {sortedPlayers.map((lp: any) => {
                      const isCol = matrixHighlight === lp.playerId;
                      return (
                        <button
                          key={lp.playerId}
                          onClick={() => setMatrixHighlight(matrixHighlight === lp.playerId ? null : lp.playerId)}
                          className="w-10 flex flex-col items-center transition-all duration-200 hover:opacity-100"
                          style={{ opacity: matrixHighlight && !isCol ? 0.3 : isCol ? 1 : 0.75 }}
                          title={lp.player?.fullName}
                        >
                          <Avatar name={lp.player?.fullName} player={lp.player} size="sm" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Rows */}
                  {sortedPlayers.map((rowPlayer: any) => {
                    const rowName = rowPlayer.player?.fullName || rowPlayer.playerId;
                    const isRowHL   = matrixHighlight === rowPlayer.playerId;
                    const isColHL   = false; // column highlight handled per-cell
                    const labelDim  = matrixHighlight && !isRowHL;
                    return (
                      <div
                        key={rowPlayer.playerId}
                        className="flex items-center gap-1 py-0.5 rounded-lg transition-all duration-200"
                        style={{
                          /* NO row-level opacity — cells control their own opacity so
                             the highlighted column isn't killed by a dimmed parent row */
                          backgroundColor: isRowHL ? 'rgba(249,115,22,0.05)' : undefined,
                        }}
                      >
                        {/* Row label — dim when another player is spotlighted */}
                        <button
                          onClick={() => setMatrixHighlight(matrixHighlight === rowPlayer.playerId ? null : rowPlayer.playerId)}
                          className="flex items-center gap-2 shrink-0 text-left pr-2 transition-all hover:opacity-100"
                          style={{ width: '10rem', opacity: labelDim ? 0.28 : 1 }}
                        >
                          <Avatar name={rowName} player={rowPlayer.player} size="sm" />
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: isRowHL ? '#f97316' : 'var(--text-secondary)', maxWidth: '6.5rem' }}
                          >
                            {rowName}
                          </span>
                        </button>

                        {/* Cells */}
                        {sortedPlayers.map((colPlayer: any) => (
                          <CellBox key={colPlayer.playerId} aId={rowPlayer.playerId} bId={colPlayer.playerId} />
                        ))}
                      </div>
                    );
                  })}
                </div>
                </div>{/* end overflow-x-auto */}
                {/* Stats bar inside desktop card */}
                <div className="px-5 py-3 flex flex-wrap gap-x-5 gap-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                  {[
                    { label: 'Završeno',  value: pairStats.completed,  color: 'text-emerald-400' },
                    { label: 'Delimično', value: pairStats.partial,    color: 'text-amber-400'   },
                    { label: 'Nije',      value: pairStats.not_played, color: 'text-slate-400'   },
                    { label: 'Ukupno',    value: pairStats.total,      color: 'text-white'       },
                  ].map(s => (
                    <div key={s.label} className="flex items-baseline gap-1.5">
                      <span className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── MOBILE: player focus list ── */}
            <div className="md:hidden space-y-4">
              {/* Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Izaberi igrača
                </label>
                <div className="relative">
                  <select
                    value={mobilePlayerId}
                    onChange={e => setMatrixMobilePlayer(e.target.value)}
                    className="input-field w-full pr-8 appearance-none"
                  >
                    {sortedPlayers.map((p: any) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.player?.fullName || p.playerId}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                </div>
              </div>

              {/* Opponent rows */}
              <div className="space-y-2">
                {mobileOpponents.map(({ lp, cell }) => {
                  const name = lp.player?.fullName || lp.playerId;
                  let statusEl: React.ReactElement;
                  if (cell?.status === 'completed')
                    statusEl = <span className="badge badge-win text-[10px] shrink-0">✓ Završeno</span>;
                  else if (cell?.status === 'partial')
                    statusEl = <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{cell.completed.length}/{expectedPerPair}</span>;
                  else if (cell?.status === 'upcoming')
                    statusEl = <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>⏳</span>;
                  else
                    statusEl = <span className="text-[10px] text-slate-500 shrink-0">Nije</span>;

                  return (
                    <button
                      key={lp.playerId}
                      onClick={() => setMatrixCell({ aId: mobilePlayerId, bId: lp.playerId })}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98] hover:brightness-110"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                    >
                      <Avatar name={name} player={lp.player} size="md" />
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                      {statusEl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats bar — mobile only (desktop has stats inside the grid card) */}
            <div className="card md:hidden px-4 py-3 flex flex-wrap gap-x-5 gap-y-2">
              {[
                { label: 'Završeno',  value: pairStats.completed,  color: 'text-emerald-400' },
                { label: 'Delimično', value: pairStats.partial,    color: 'text-amber-400'   },
                { label: 'Nije',      value: pairStats.not_played, color: 'text-slate-400'   },
                { label: 'Ukupno',    value: pairStats.total,      color: 'text-white'       },
              ].map(s => (
                <div key={s.label} className="flex items-baseline gap-1.5">
                  <span className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                </div>
              ))}
            </div>

            {cellModal}
          </div>
        );
      })()}

      {/* ══ STICKY MOBILE BOTTOM ACTION BAR ════════════════════════ */}
      {tab === 'raspored' && isSessionMode && canEdit && activeSessionForBar && (() => {
        const asSm = fixtures.filter((m: any) => m.sessionId === activeSessionForBar.id);
        const doneCount = asSm.filter((m: any) => m.status === 'completed').length;
        return (
          <>
            {/* ── Fixed bottom bar ── */}
            <div
              className={`lg:hidden fixed bottom-0 inset-x-0 z-40 transition-transform duration-200 ease-in-out ${
                bottomBarVisible ? 'translate-y-0' : 'translate-y-full'
              }`}
              style={{
                background: 'linear-gradient(to top, rgba(15,23,42,0.97) 70%, transparent)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(51,65,85,0.45)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              <div className="flex items-center gap-2.5 px-4 py-3">
                {/* PRIMARY: Add match */}
                <button
                  onClick={() => openManualMatch(activeSessionForBar)}
                  className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg,#f97316,#ea580c)',
                    boxShadow: '0 4px 16px rgba(249,115,22,0.30)',
                  }}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  Dodaj Meč
                </button>

                {/* SECONDARY: Schedule PDF */}
                <button
                  onClick={() => handleDownloadScoresheet(activeSessionForBar, asSm)}
                  disabled={downloadingScoresheet === activeSessionForBar.id}
                  className="flex items-center justify-center gap-1.5 h-12 px-4 rounded-xl font-medium text-sm transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{
                    backgroundColor: 'rgba(249,115,22,0.09)',
                    border: '1px solid rgba(249,115,22,0.22)',
                    color: '#fb923c',
                  }}
                >
                  {downloadingScoresheet === activeSessionForBar.id
                    ? <span className="animate-spin w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full inline-block" />
                    : <Download className="w-4 h-4 shrink-0" />
                  }
                  <span className="hidden sm:inline">Raspored</span>
                </button>

                {/* MORE: bottom sheet trigger */}
                <button
                  onClick={() => setShowMoreSheet(true)}
                  className="flex items-center justify-center w-12 h-12 rounded-xl transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: 'rgba(30,41,59,0.85)',
                    border: '1px solid rgba(51,65,85,0.5)',
                    color: '#94a3b8',
                  }}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Bottom sheet: More actions ── */}
            {showMoreSheet && (
              <div
                className="lg:hidden fixed inset-0 z-50"
                onClick={() => setShowMoreSheet(false)}
              >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

                {/* Sheet */}
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-2xl animate-slide-up"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid rgba(51,65,85,0.5)',
                    borderBottom: 'none',
                    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Handle */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-9 h-1 rounded-full bg-slate-600/70" />
                  </div>

                  <div className="px-4 pb-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
                      Više akcija · Dan {activeSessionForBar.sessionNumber}
                    </p>

                    {/* Rezultati PDF — only if matches done */}
                    {doneCount > 0 && (
                      <button
                        onClick={() => {
                          setShowMoreSheet(false);
                          handleDownloadPDF(activeSessionForBar.sessionNumber, asSm);
                        }}
                        disabled={downloadingRound === activeSessionForBar.sessionNumber}
                        className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl mb-2 transition-all active:scale-[0.98] disabled:opacity-50"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: 'rgba(100,116,139,0.15)' }}
                        >
                          {downloadingRound === activeSessionForBar.sessionNumber
                            ? <span className="animate-spin w-4 h-4 border-2 border-slate-400/30 border-t-slate-300 rounded-full inline-block" />
                            : <Download className="w-4 h-4 text-slate-300" />
                          }
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-medium text-white block">Rezultati PDF</span>
                          <span className="text-xs text-slate-500">{doneCount} odigranih mečeva</span>
                        </div>
                      </button>
                    )}

                    {/* Podeli ligu */}
                    <button
                      onClick={() => {
                        setShowMoreSheet(false);
                        setShowQr(true);
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl mb-2 transition-all active:scale-[0.98]"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'rgba(249,115,22,0.12)' }}
                      >
                        <QrCode className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium text-white block">Podeli ligu</span>
                        <span className="text-xs text-slate-500">Generiši link za čitanje</span>
                      </div>
                    </button>

                    {/* Zatvori sesiju — destructive */}
                    <button
                      onClick={() => {
                        setShowMoreSheet(false);
                        setShowCloseConfirm(true);
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all active:scale-[0.98]"
                      style={{
                        backgroundColor: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.18)',
                      }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-semibold text-red-400 block">Zatvori Sesiju</span>
                        <span className="text-xs text-slate-500">Završi aktivni ligaški dan</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Close session confirmation ── */}
            {showCloseConfirm && (
              <div
                className="lg:hidden fixed inset-0 z-50 flex items-end"
                onClick={() => setShowCloseConfirm(false)}
              >
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />
                <div
                  className="relative w-full rounded-t-2xl p-5 animate-slide-up"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid rgba(51,65,85,0.5)',
                    borderBottom: 'none',
                    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Handle */}
                  <div className="flex justify-center -mt-1 mb-4">
                    <div className="w-9 h-1 rounded-full bg-slate-600/70" />
                  </div>

                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-11 h-11 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">Zatvori sesiju?</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ligaški Dan {activeSessionForBar.sessionNumber}
                        {' · '}{doneCount}/{activeSessionForBar.matchCount} odigrano
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                    Sesija se premešta u arhivu. Neodigrani mečevi ostaju u evidenciji i mogu se naknadno uneti.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCloseConfirm(false)}
                      className="flex-1 h-12 rounded-xl font-medium text-sm text-slate-300 transition-all active:scale-[0.97]"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid rgba(51,65,85,0.5)',
                      }}
                    >
                      Otkaži
                    </button>
                    <button
                      onClick={() => {
                        setShowCloseConfirm(false);
                        handleCloseSession(activeSessionForBar.id);
                      }}
                      disabled={closingSession === activeSessionForBar.id}
                      className="flex-1 h-12 rounded-xl font-semibold text-sm text-white bg-red-500 hover:bg-red-600 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {closingSession === activeSessionForBar.id
                        ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
                        : <Lock className="w-4 h-4" />
                      }
                      Zatvori
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

    </div>

    {/* ── Delete session confirm modal ── */}
    {deleteSessionConfirm && (
      <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in" onClick={() => setDeleteSessionConfirm(null)}>
        <div className="card w-full sm:max-w-sm p-5 sm:p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-white font-semibold text-base">Obrisati ligaški dan?</p>
            </div>
            <button onClick={() => setDeleteSessionConfirm(null)} className="p-1.5 rounded-xl hover:bg-slate-700 transition-colors shrink-0" style={{ color: 'var(--text-secondary)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Body */}
          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            Neodigrani mečevi se vraćaju u pool. Odigrani mečevi ostaju sačuvani u istoriji sesije.
          </p>
          {/* Actions */}
          <div className="flex gap-2.5">
            <button onClick={() => setDeleteSessionConfirm(null)} className="btn-secondary flex-1 justify-center text-sm py-2.5">
              Otkaži
            </button>
            <button onClick={confirmDeleteSession} className="flex-1 justify-center text-sm py-2.5 rounded-xl font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 hover:border-red-500/40 transition-all">
              Obriši
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function Modal({ children, onClose, wide, scrollable }: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  scrollable?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div
        className={[
          'card w-full p-5 sm:p-6 animate-scale-in',
          wide ? 'sm:max-w-lg' : 'sm:max-w-sm',
          scrollable ? 'max-h-[90vh] overflow-y-auto' : '',
          'rounded-t-2xl sm:rounded-2xl',
          // Mobile bottom sheet feel
          'sm:rounded-xl',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function SubPreviewSection({ label, color, prefix, items }: {
  label: string; color: string; prefix: string; items: string[];
}) {
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${color}`}>{label}</p>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className={color}>{prefix}</span>
            <span className="text-slate-400">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, action, small }: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className={`text-center ${small ? 'py-8' : 'py-12'}`}>
      <div className={`${small ? 'w-10 h-10' : 'w-14 h-14'} rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-600`}>
        {icon}
      </div>
      <p className={`font-semibold text-white mb-1 ${small ? 'text-sm' : 'text-base'}`}>{title}</p>
      {desc && <p className="text-slate-500 text-sm mb-4 max-w-xs mx-auto">{desc}</p>}
      {action}
    </div>
  );
}

function StatPill({ label, value, hint, color = 'text-white' }: {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
      {hint && <span className="text-[10px] text-slate-600">({hint})</span>}
    </div>
  );
}

