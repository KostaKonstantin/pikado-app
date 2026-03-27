'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
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
} from 'lucide-react';
import QRCodeSVG from 'react-qr-code';

type Tab = 'tabela' | 'raspored' | 'odlozeni' | 'igraci';

/* ─── helpers ──────────────────────────────────────────────────────── */

function Avatar({ name, size = 'sm' }: { name?: string; size?: 'sm' | 'md' }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'md' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs';
  return (
    <div className={`${sz} rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0`}>
      {initials}
    </div>
  );
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
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
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
          {selectedPlayer && <Avatar name={selectedPlayer.player?.fullName} size="sm" />}
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
              <Avatar name={lp.player?.fullName} size="sm" />
              <span className="truncate font-medium">{lp.player?.fullName}</span>
            </button>
          ))
        )}
      </div>
    </div>
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
  const [closingSession, setClosingSession]   = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Substitution history
  const [substitutions, setSubstitutions] = useState<any[]>([]);

  // Substitution modal (round mode only)
  const [subEvening, setSubEvening]           = useState<number | null>(null);
  const [subPairs, setSubPairs]               = useState<{ absentId: string; substituteId: string }[]>([{ absentId: '', substituteId: '' }]);
  const [subPreview, setSubPreview]           = useState<any>(null);
  const [subPreviewLoading, setSubPreviewLoading] = useState(false);
  const [subSaving, setSubSaving]             = useState(false);

  // QR code modal
  const [showQr, setShowQr]   = useState(false);
  const [copied, setCopied]   = useState(false);

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
      await generateStandingsPDF({ leagueName: league.name, standings, stats });
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
    // Default: all players present
    setSessionPresent(new Set(lPlayers.map((lp: any) => lp.playerId)));
    setSessionMaxPer(1);
    setSessionDate('');
    setSessionPreview(null);
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
    if (!club?.id || sessionPresent.size < 2) return;
    setCreatingSession(true);
    try {
      const newSession = await leaguesApi.createSession(club.id, id, {
        presentPlayerIds: [...sessionPresent],
        maxMatchesPerPlayer: sessionMaxPer,
        sessionDate: sessionDate || null,
      });
      setNewSessionOpen(false);
      setSessionPreview(null);
      // Auto-expand the newly created session
      setExpandedSessions((prev) => new Set([...prev, newSession.id]));
      await load();
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
    } finally { setClosingSession(null); }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!club?.id) return;
    if (!confirm('Obrisati sesiju? Neodigrani mečevi se vraćaju u pool.')) return;
    setDeletingSession(sessionId);
    try {
      await leaguesApi.deleteSession(club.id, id, sessionId);
      await load();
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

  const openManualMatch = (session: any) => {
    setManualMatchSession(session);
    setManualHome('');
    setManualAway('');
    setManualCheck(null);
  };

  const closeManualMatch = () => {
    setManualMatchSession(null);
    setManualHome('');
    setManualAway('');
    setManualCheck(null);
  };

  const runManualCheck = async (homeId: string, awayId: string, sessionId: string) => {
    if (!homeId || !awayId || homeId === awayId || !club?.id) { setManualCheck(null); return; }
    setManualChecking(true);
    try {
      const result = await leaguesApi.checkManualMatch(club.id, id, sessionId, homeId, awayId);
      setManualCheck(result);
    } catch { setManualCheck(null); }
    finally { setManualChecking(false); }
  };

  const handleAddManualMatch = async () => {
    if (!club?.id || !manualMatchSession || !manualHome || !manualAway) return;
    if (manualCheck?.status === 'blocked') return;
    setManualSaving(true);
    try {
      await leaguesApi.addManualMatch(club.id, id, manualMatchSession.id, manualHome, manualAway);
      closeManualMatch();
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Greška pri dodavanju meča');
    } finally { setManualSaving(false); }
  };

  // Multi-select players
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  /* ── actions ─────────────────────────────────────────────── */
  const addPlayer    = async (playerId: string) => { await leaguesApi.addPlayer(club!.id, id, playerId); load(); };
  const removePlayer = async (playerId: string) => { await leaguesApi.removePlayer(club!.id, id, playerId); load(); };

  const generate = async () => {
    if (lPlayers.length < 2) { alert('Potrebna su najmanje 2 igrača'); return; }
    setGenerating(true);
    try { await leaguesApi.generateFixtures(club!.id, id); load(); } finally { setGenerating(false); }
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

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'tabela',   label: 'Tabela',   icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'raspored', label: 'Raspored', icon: <Calendar  className="w-3.5 h-3.5" /> },
    ...(!isSessionMode ? [{ id: 'odlozeni' as Tab, label: 'Odloženi', icon: <AlertCircle className="w-3.5 h-3.5" />, badge: postponedMatches.length }] : []),
    { id: 'igraci',   label: 'Igrači',   icon: <Users     className="w-3.5 h-3.5" /> },
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
    <div className="animate-fade-in">
      <Topbar title={league.name} />

      <div className="p-4 md:p-6 space-y-5">

        {/* Back */}
        <Link href="/leagues" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Sve lige
        </Link>

        {/* League stats bar — all values dynamic from formula, not hardcoded */}
        {stats && stats.playerCount >= 2 && (
          <div className="card px-4 py-3 animate-fade-in-up stagger-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <StatPill label="Igrači"  value={stats.playerCount} />
              <StatPill label="Rundi"   value={stats.expectedRounds}       hint={stats.isDoubleRoundRobin ? '2× krug' : '1× krug'} />
              {!isSessionMode && <StatPill label="Mečeva/dan" value={stats.matchesPerRound} />}
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
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
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

        {/* Tab bar */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-0.5">
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
        </div>

        {/* ══════════════════ TABELA ══════════════════════════ */}
        {tab === 'tabela' && (
          <div className="animate-fade-in-up space-y-4">
            <div className="card overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-slate-400" /> Tabela
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* QR disabled for now */}
                  {/* {league?.slug && (
                    <button
                      onClick={() => setShowQr(true)}
                      className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-slate-600 text-slate-300 hover:border-orange-500 hover:text-orange-400 transition-colors"
                      title="QR kod za javnu tabelu"
                    >
                      <QrCode className="w-3.5 h-3.5" /> QR
                    </button>
                  )} */}
                  {fixtures.length > 0 && (
                    <button
                      onClick={handleDownloadPlayerSheet}
                      disabled={downloadingPlayerSheet}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingPlayerSheet
                        ? <><span className="animate-spin w-4 h-4 border-2 border-slate-400/30 border-t-slate-300 rounded-full" /><span className="hidden sm:inline">Generisanje...</span></>
                        : <><Download className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Lista igrača</span><span className="sm:hidden">Lista</span></>
                      }
                    </button>
                  )}
                  {standings.length > 0 && (
                    <button
                      onClick={handleDownloadStandings}
                      disabled={downloadingStandings}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/20 hover:border-orange-500/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingStandings
                        ? <><span className="animate-spin w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full" /><span className="hidden sm:inline">Generisanje...</span></>
                        : <><Download className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Tabela PDF</span><span className="sm:hidden">PDF</span></>
                      }
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={generate}
                      disabled={generating}
                      className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
                    >
                      {generating
                        ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full mr-1.5" />Generisanje...</>
                        : fixtures.length > 0 ? 'Regeneriši' : 'Generiši Raspored'
                      }
                    </button>
                  )}
                </div>
              </div>

              {standings.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="w-10 h-10" />}
                  title="Nema podataka"
                  desc="Dodajte igrače i generišite raspored da biste videli tabelu."
                />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {['#', 'Igrač', 'M', 'P', 'R', 'G', 'L+', 'L-', 'Bod.'].map((h) => (
                            <th key={h} className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {standings.map((s, idx) => (
                          <tr
                            key={s.player?.id || s.position}
                            className={[
                              'transition-colors',
                              s.position === 1 ? 'bg-yellow-500/[0.04]' : 'hover:bg-slate-800/40',
                            ].join(' ')}
                            style={{ animationDelay: `${idx * 30}ms` }}
                          >
                            <td className="px-4 py-3"><RankBadge pos={s.position} /></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar name={s.player?.fullName} />
                                <span className="font-medium text-white text-sm">{s.player?.fullName}</span>
                                {s.position === 1 && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400 tabular-nums">{s.played}</td>
                            <td className="px-4 py-3 text-green-400 font-medium tabular-nums">{s.won}</td>
                            <td className="px-4 py-3 text-yellow-400 font-medium tabular-nums">{s.drawn}</td>
                            <td className="px-4 py-3 text-red-400 font-medium tabular-nums">{s.lost}</td>
                            <td className="px-4 py-3 text-slate-300 tabular-nums">{s.setsFor}</td>
                            <td className="px-4 py-3 text-slate-500 tabular-nums">{s.setsAgainst}</td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-orange-400 text-base tabular-nums">{s.points}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-slate-700/50">
                    {standings.map((s) => (
                      <div key={s.player?.id || s.position}
                        className={`px-4 py-3 ${s.position === 1 ? 'bg-yellow-500/[0.04]' : ''}`}>
                        <div className="flex items-center gap-3">
                          <RankBadge pos={s.position} />
                          <Avatar name={s.player?.fullName} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white text-sm truncate">{s.player?.fullName}</span>
                              {s.position === 1 && <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[11px] text-green-400">{s.won}P</span>
                              <span className="text-[11px] text-yellow-400">{s.drawn}R</span>
                              <span className="text-[11px] text-red-400">{s.lost}G</span>
                              <span className="text-[11px] text-slate-500">{s.setsFor}/{s.setsAgainst} L</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-bold text-orange-400 tabular-nums">{s.points}</span>
                            <p className="text-[11px] text-slate-500">{s.played} odig.</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Legend */}
            {standings.length > 0 && (
              <div className="flex flex-wrap gap-3 px-1">
                {[
                  { color: 'text-green-400', label: 'P – Pobeda' },
                  { color: 'text-yellow-400', label: 'R – Remi' },
                  { color: 'text-red-400', label: 'G – Gubitak' },
                  { color: 'text-slate-400', label: 'M – Mečevi' },
                ].map(({ color, label }) => (
                  <span key={label} className={`text-[11px] ${color}`}>{label}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ RASPORED ════════════════════════ */}
        {tab === 'raspored' && (
          <div className="animate-fade-in-up space-y-3">

            {/* ── NEW session system ─────────────────────────────── */}
            {isSessionMode ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" /> Sesije ligaških dana
                    </h3>
                    {fixtures.length > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pool: {fixtures.filter((m: any) => m.status === 'pending' && !m.sessionId).length} neodigranih · {fixtures.filter((m: any) => m.sessionId).length} raspoređenih
                      </p>
                    )}
                  </div>
                  {canEdit && fixtures.length > 0 && (
                    <button
                      onClick={openNewSession}
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Novi Ligaški Dan
                    </button>
                  )}
                </div>

                {/* Empty states */}
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
                      <button onClick={openNewSession} className="btn-primary text-sm mx-auto">
                        <Plus className="w-4 h-4" /> Nova sesija
                      </button>
                    )}
                  </div>
                ) : (
                  // Session cards
                  sessions.map((session: any) => {
                    const isExpanded = expandedSessions.has(session.id);
                    const sessionMatches: any[] = fixtures.filter((m: any) => m.sessionId === session.id);
                    const completedCount = sessionMatches.filter((m: any) => m.status === 'completed').length;
                    const allDone = session.status === 'closed' || completedCount === session.matchCount;
                    const isOpen = session.status === 'open';

                    // Use session.matches if present (from getSession), else from fixtures
                    const displayMatches = sessionMatches.length > 0 ? sessionMatches : [];

                    return (
                      <div key={session.id} className="card overflow-hidden">
                        {/* Session header */}
                        <div
                          className={`px-4 py-3 border-b border-slate-700/60 cursor-pointer select-none ${
                            allDone ? 'bg-green-500/5' : 'bg-slate-800/40'
                          }`}
                          onClick={() => toggleExpanded(session.id)}
                        >
                          {/* Title row */}
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                              allDone ? 'bg-green-500/20 text-green-400' : isOpen ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-white'
                            }`}>
                              {session.sessionNumber}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-white">Ligaški Dan {session.sessionNumber}</p>
                                {isOpen
                                  ? <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/15 text-orange-400 rounded-full font-medium flex items-center gap-0.5"><Unlock className="w-2.5 h-2.5" />Otvorena</span>
                                  : <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded-full font-medium flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Zatvorena</span>
                                }
                                {allDone && <span className="text-[10px] text-green-400 font-medium flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Završena</span>}
                              </div>
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-0 mt-0.5">
                                <span className="text-xs text-slate-500">{session.completedCount}/{session.matchCount} odigrano</span>
                                <span className="text-xs text-slate-600">·</span>
                                <span className="text-xs text-slate-500">{session.presentPlayerIds?.length ?? 0} igrača</span>
                                {session.sessionDate && (
                                  <>
                                    <span className="text-xs text-slate-600">·</span>
                                    <span className="text-xs text-slate-500">{new Date(session.sessionDate).toLocaleDateString('sr-RS')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="p-2 text-slate-500 rounded-lg shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>

                          {/* Action buttons row */}
                          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDownloadScoresheet(session, displayMatches)}
                              disabled={downloadingScoresheet === session.id}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 rounded-lg transition-colors font-medium disabled:opacity-50"
                              title="Preuzmi raspored ligaškog dana za štampu">
                              {downloadingScoresheet === session.id
                                ? <span className="animate-spin w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-400 rounded-full inline-block" />
                                : <Download className="w-3.5 h-3.5" />
                              }
                              Raspored
                            </button>
                            {session.completedCount > 0 && (
                              <button
                                onClick={() => handleDownloadPDF(session.sessionNumber, displayMatches)}
                                disabled={downloadingRound === session.sessionNumber}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                                title="Preuzmi PDF izveštaj">
                                {downloadingRound === session.sessionNumber
                                  ? <span className="animate-spin w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-300 rounded-full inline-block" />
                                  : <Download className="w-3.5 h-3.5" />
                                }
                                Rezultati PDF
                              </button>
                            )}
                            {canEdit && isOpen && (
                              <button
                                onClick={() => handleCloseSession(session.id)}
                                disabled={closingSession === session.id}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                                title="Zatvori sesiju">
                                {closingSession === session.id
                                  ? <span className="animate-spin w-3 h-3 border-2 border-slate-400/30 border-t-slate-300 rounded-full inline-block" />
                                  : <Lock className="w-3.5 h-3.5" />
                                }
                                Zatvori
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                disabled={deletingSession === session.id}
                                className="ml-auto p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                                title="Obriši sesiju">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Progress bar */}
                          {session.matchCount > 0 && (
                            <div className="mt-2.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500/70 rounded-full transition-all duration-500"
                                style={{ width: `${(session.completedCount / session.matchCount) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Match list — expanded */}
                        {isExpanded && displayMatches.length > 0 && (
                          <div className="divide-y divide-slate-700/30">
                            {displayMatches.map((m: any, idx: number) => {
                              const completed = m.status === 'completed';
                              const homeWon   = completed && m.homeSets > m.awaySets;
                              const awayWon   = completed && m.awaySets > m.homeSets;
                              const isDraw    = completed && m.homeSets === m.awaySets;
                              const rowClass  = completed && !homeWon && !awayWon ? 'result-draw' : '';
                              return (
                                <div key={m.id} className={`flex items-center px-3 sm:px-4 py-3 gap-2 transition-colors hover:bg-slate-800/30 ${rowClass}`}>
                                  <span className="text-[10px] text-slate-700 w-4 shrink-0 select-none tabular-nums text-center">{idx + 1}</span>
                                  {/* Home */}
                                  <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                                    {homeWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                    <span className={`text-sm text-right font-medium truncate ${
                                      homeWon ? 'text-green-400' : awayWon ? 'text-slate-500' : 'text-white'
                                    }`}>{m.homePlayer?.fullName}</span>
                                  </div>
                                  {/* Score */}
                                  <div className="w-12 text-center shrink-0">
                                    {completed ? (
                                      <span className={`text-sm font-bold tabular-nums px-1.5 py-0.5 rounded ${
                                        isDraw ? 'text-yellow-400' : homeWon ? 'text-green-400' : 'text-red-400'
                                      }`}>{m.homeSets}:{m.awaySets}</span>
                                    ) : (
                                      <span className="text-xs text-slate-600 font-medium">vs</span>
                                    )}
                                  </div>
                                  {/* Away */}
                                  <div className="flex-1 flex items-center gap-1 min-w-0">
                                    {awayWon && <Zap className="w-3 h-3 text-green-400 shrink-0" />}
                                    <span className={`text-sm font-medium truncate ${
                                      awayWon ? 'text-green-400' : homeWon ? 'text-slate-500' : 'text-white'
                                    }`}>{m.awayPlayer?.fullName}</span>
                                  </div>
                                  {/* Actions */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {m.isWalkover && completed && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded font-bold">WO</span>
                                    )}
                                    {canEdit && !completed && isOpen && (
                                      <>
                                        <button
                                          onClick={() => { setEditMatch(m); setMatchScores({ home: 0, away: 0 }); }}
                                          className="text-xs px-2.5 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg transition-colors font-medium touch-target">
                                          Unesi
                                        </button>
                                        <button
                                          onClick={() => { setWalkoverMatch(m); setWalkoverId(''); }}
                                          className="p-2 text-slate-600 hover:text-red-400 rounded-lg transition-colors touch-target flex items-center justify-center"
                                          title="Valkover">
                                          <Ban className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                    {canEdit && completed && !m.isWalkover && (
                                      <button
                                        onClick={() => { setEditMatch(m); setMatchScores({ home: m.homeSets, away: m.awaySets }); }}
                                        className="text-[11px] px-2 py-1 text-slate-600 hover:text-slate-300 rounded-lg transition-colors">
                                        Ispravi
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {isExpanded && displayMatches.length === 0 && (
                          <div className="px-4 py-6 text-center text-xs text-slate-500">
                            Mečevi se učitavaju — klikni "Zatvori" pa ponovo otvori sesiju da ih vidiš.
                          </div>
                        )}

                        {/* Add manual match button — only for open sessions */}
                        {isExpanded && canEdit && isOpen && (
                          <div className="px-4 py-2.5 border-t border-slate-700/40">
                            <button
                              onClick={() => openManualMatch(session)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors font-medium w-full justify-center border border-dashed border-slate-700 hover:border-slate-500"
                            >
                              <Plus className="w-3.5 h-3.5" /> Dodaj Meč Ručno
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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
                          <div className="mt-2.5 h-1 bg-slate-700 rounded-full overflow-hidden">
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
        {tab === 'odlozeni' && (
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

        {/* ══════════════════ IGRAČI ══════════════════════════ */}
        {tab === 'igraci' && (
          <div className="animate-fade-in-up space-y-4">

            {/* Bulk add */}
            {canEdit && (
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-400" /> Brzo dodaj igrače
                  </h3>
                  <span className="text-xs text-slate-500">jedno ime po redu, ili razdvojeno zarezom</span>
                </div>
                <textarea
                  ref={bulkRef}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleBulkAdd(); }}
                  placeholder={'Marko Petrović\nNikola Jovanović\nStefan Ilić'}
                  rows={3}
                  className="input-field resize-none text-sm font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {bulkText.trim()
                      ? `${bulkText.split(/[\n,]+/).filter((s) => s.trim()).length} igrač(a)`
                      : 'Ctrl+Enter za brzo dodavanje'}
                  </div>
                  <button
                    onClick={handleBulkAdd}
                    disabled={!bulkText.trim() || bulkAdding}
                    className="btn-primary text-sm py-2 disabled:opacity-50"
                  >
                    {bulkAdding
                      ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full mr-1.5" />Dodavanje...</>
                      : <><Plus className="w-4 h-4" />Dodaj</>
                    }
                  </button>
                </div>

                {/* Feedback */}
                {bulkFeedback && (
                  <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg animate-fade-in-up">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-xs text-green-300">
                      {bulkFeedback.added > 0 && `${bulkFeedback.added} dodato`}
                      {bulkFeedback.created > 0 && ` · ${bulkFeedback.created} kreiran(o)`}
                      {bulkFeedback.skipped > 0 && ` · ${bulkFeedback.skipped} preskočen(o)`}
                    </span>
                  </div>
                )}

                {/* Quick pick from existing */}
                {availablePlayers.length > 0 && (
                  <div>
                    <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">Postojeći igrači kluba</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availablePlayers.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => addPlayer(p.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-slate-700 hover:bg-orange-500/20 hover:text-orange-300 text-slate-300 rounded-lg transition-all active:scale-95"
                        >
                          <Plus className="w-3 h-3" />{p.fullName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Registered players */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" /> Igrači u ligi
                  <span className="text-xs font-normal text-slate-500">({lPlayers.length})</span>
                </h3>
                {canEdit && selectedPlayerIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{selectedPlayerIds.size} izabrano</span>
                    <button
                      onClick={() => setSelectedPlayerIds(new Set())}
                      className="text-xs px-2.5 py-1.5 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      Poništi
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                      {bulkDeleting
                        ? <span className="animate-spin inline-block w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                      Ukloni izabrane
                    </button>
                  </div>
                )}
              </div>

              {lPlayers.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-8 h-8" />}
                  title="Nema igrača"
                  desc="Dodajte igrače koristeći formu iznad."
                  small
                />
              ) : (
                <div className="divide-y divide-slate-700/40">
                  {lPlayers.map((lp: any, idx: number) => {
                    const standing = standings.find((s: any) => s.player?.id === lp.playerId);
                    const isSelected = selectedPlayerIds.has(lp.playerId);
                    return (
                      <div
                        key={lp.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors group cursor-pointer ${isSelected ? 'bg-red-500/[0.06]' : 'hover:bg-slate-800/40'}`}
                        style={{ animationDelay: `${idx * 25}ms` }}
                        onClick={canEdit ? () => toggleSelectPlayer(lp.playerId) : undefined}
                      >
                        {canEdit && (
                          <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500 border-red-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                            {isSelected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                          </div>
                        )}
                        <Avatar name={lp.player?.fullName} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{lp.player?.fullName}</p>
                          {standing && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {standing.played} meč · <span className="text-green-400">{standing.won}P</span> <span className="text-yellow-400">{standing.drawn}R</span> <span className="text-red-400">{standing.lost}G</span> · <span className="text-orange-400 font-semibold">{standing.points} bod.</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedPlayer(lp)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors touch-target"
                          >
                            Detalji <ChevronRight className="w-3 h-3" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => removePlayer(lp.playerId)}
                              className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors touch-target flex items-center justify-center opacity-0 group-hover:opacity-100"
                              title="Ukloni iz lige"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL: Ručno dodavanje meča ══════════════════════════ */}
      {manualMatchSession && (
        <Modal onClose={closeManualMatch} scrollable>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-orange-400" />
              Dodaj Meč — Ligaški Dan {manualMatchSession.sessionNumber}
            </h3>
            <button onClick={closeManualMatch} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Home player */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Domaćin</label>
              <PlayerCombobox
                value={manualHome}
                onChange={(pid) => {
                  setManualHome(pid);
                  setManualCheck(null);
                  if (pid && manualAway && pid !== manualAway) {
                    runManualCheck(pid, manualAway, manualMatchSession.id);
                  }
                }}
                players={lPlayers}
                excludeId={manualAway}
                placeholder="— Pretraži domaćina —"
              />
            </div>

            {/* Swap indicator */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <div className="h-px w-12 bg-slate-700" />
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <div className="h-px w-12 bg-slate-700" />
              </div>
            </div>

            {/* Away player */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Gost</label>
              <PlayerCombobox
                value={manualAway}
                onChange={(pid) => {
                  setManualAway(pid);
                  setManualCheck(null);
                  if (manualHome && pid && manualHome !== pid) {
                    runManualCheck(manualHome, pid, manualMatchSession.id);
                  }
                }}
                players={lPlayers}
                excludeId={manualHome}
                placeholder="— Pretraži gosta —"
              />
            </div>

            {/* Validation feedback */}
            {(manualChecking || manualCheck) && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-3 ${
                manualChecking ? 'bg-slate-800 border border-slate-700' :
                manualCheck?.status === 'blocked' ? 'bg-red-500/10 border border-red-500/30' :
                manualCheck?.status === 'second'  ? 'bg-amber-500/10 border border-amber-500/30' :
                                                    'bg-green-500/10 border border-green-500/30'
              }`}>
                {manualChecking ? (
                  <span className="animate-spin w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full shrink-0 mt-0.5" />
                ) : manualCheck?.status === 'blocked' ? (
                  <span className="text-red-400 text-base shrink-0">❌</span>
                ) : manualCheck?.status === 'second' ? (
                  <span className="text-amber-400 text-base shrink-0">⚠️</span>
                ) : (
                  <span className="text-green-400 text-base shrink-0">✅</span>
                )}
                <div>
                  {manualChecking && <p className="text-slate-400">Provjera...</p>}
                  {!manualChecking && manualCheck?.status === 'blocked' && (
                    <>
                      <p className="font-semibold text-red-400">Nije moguće dodati meč</p>
                      <p className="text-xs text-red-400/70 mt-0.5">Ovi igrači su već odigrali oba predviđena meča u ligi.</p>
                    </>
                  )}
                  {!manualChecking && manualCheck?.status === 'second' && (
                    <>
                      <p className="font-semibold text-amber-400">Validan meč — drugi (poslednji) susret</p>
                      <p className="text-xs text-amber-400/70 mt-0.5">
                        Nakon ovog meča {manualCheck.isFromPool ? '(iz pool-a)' : ''}, ovi igrači više neće moći igrati jedan protiv drugog.
                      </p>
                    </>
                  )}
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

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={closeManualMatch}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={handleAddManualMatch}
                disabled={
                  !manualHome || !manualAway || manualHome === manualAway ||
                  !manualCheck || manualCheck.status === 'blocked' ||
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
          </div>
        </Modal>
      )}

      {/* ══ MODAL: QR kod ════════════════════════════════════════ */}
      {showQr && league?.slug && (() => {
        const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        const publicUrl = `${origin}/public/leagues/${league.slug}`;
        const handleCopy = () => {
          navigator.clipboard.writeText(publicUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        };
        return (
          <Modal onClose={() => setShowQr(false)}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-orange-400" /> Javna tabela — QR kod
              </h3>
              <button onClick={() => setShowQr(false)} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-5">
              Skeniraj QR ili podeli link. Igrači mogu videti tabelu bez prijave u aplikaciju.
            </p>

            {/* QR code */}
            <div className="flex justify-center mb-5">
              <div className="bg-white p-4 rounded-2xl shadow-xl">
                <QRCodeSVG value={publicUrl} size={200} />
              </div>
            </div>

            {/* URL + copy */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-700">
              <span className="text-xs text-slate-400 flex-1 truncate font-mono">{publicUrl}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors font-medium shrink-0"
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Kopirano</> : <><Copy className="w-3.5 h-3.5" /> Kopiraj</>}
              </button>
            </div>

            <p className="text-[11px] text-slate-600 mt-3 text-center">
              Tabela se automatski osvežava svakih 60 sekundi
            </p>
          </Modal>
        );
      })()}

      {/* ══ MODAL: Nova sesija ═══════════════════════════════════ */}
      {newSessionOpen && (
        <Modal onClose={() => { setNewSessionOpen(false); setSessionPreview(null); }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-orange-400" /> Novi Ligaški Dan
            </h3>
            <button onClick={() => { setNewSessionOpen(false); setSessionPreview(null); }} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"><X className="w-5 h-5" /></button>
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
              <label className="text-xs text-slate-400">Prisutni igrači ({sessionPresent.size}/{lPlayers.length})</label>
              <div className="flex gap-2">
                <button onClick={() => { setSessionPresent(new Set(lPlayers.map((lp: any) => lp.playerId))); setSessionPreview(null); }} className="text-xs text-slate-400 hover:text-white">Svi</button>
                <span className="text-slate-700">·</span>
                <button onClick={() => { setSessionPresent(new Set()); setSessionPreview(null); }} className="text-xs text-slate-400 hover:text-white">Nijedan</button>
              </div>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {lPlayers.map((lp: any) => {
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
                    <Avatar name={lp.player?.fullName} size="sm" />
                    <span className="text-sm text-white font-medium flex-1">{lp.player?.fullName}</span>
                  </label>
                );
              })}
            </div>
          </div>

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

          <div className="flex gap-2">
            <button
              onClick={handleCreateSession}
              disabled={creatingSession || sessionPresent.size < 2}
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

      {/* ══ MODAL: Unesi Rezultat ══════════════════════════════ */}
      {editMatch && (
        <Modal onClose={() => setEditMatch(null)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white">
              {editMatch.status === 'completed' ? 'Ispravi Rezultat' : 'Unesi Rezultat'}
            </h3>
            <button onClick={() => setEditMatch(null)} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
          {(() => {
            const max = league.setsPerMatch === 1 ? league.legsPerSet : league.setsPerMatch;
            return (
              <>
                <p className="text-xs text-slate-500 text-center mb-4">Maks. {max} po igraču</p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 text-center space-y-2">
                    <p className="text-xs text-slate-400">Domaćin</p>
                    <p className="text-sm font-semibold text-white leading-tight">{editMatch.homePlayer?.fullName}</p>
                    <input type="number" className="input-field text-center text-lg font-bold" min={0} max={max} value={matchScores.home}
                      onChange={(e) => setMatchScores({ ...matchScores, home: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="text-slate-600 text-2xl font-light mb-1">:</div>
                  <div className="flex-1 text-center space-y-2">
                    <p className="text-xs text-slate-400">Gost</p>
                    <p className="text-sm font-semibold text-white leading-tight">{editMatch.awayPlayer?.fullName}</p>
                    <input type="number" className="input-field text-center text-lg font-bold" min={0} max={max} value={matchScores.away}
                      onChange={(e) => setMatchScores({ ...matchScores, away: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                {matchScoreError && (
                  <p className="text-xs text-red-400 text-center mb-3 p-2 bg-red-500/10 rounded-lg">{matchScoreError}</p>
                )}
              </>
            );
          })()}
          <div className="flex gap-2 mt-2">
            <button onClick={saveMatchResult} disabled={!!matchScoreError} className="btn-primary flex-1 justify-center text-sm disabled:opacity-40">Sačuvaj</button>
            <button onClick={() => setEditMatch(null)} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
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
        return (
          <Modal onClose={() => setSelectedPlayer(null)} wide>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Avatar name={selectedPlayer.player?.fullName} size="md" />
                <div>
                  <h3 className="font-bold text-white">{selectedPlayer.player?.fullName}</h3>
                  {standing && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="text-orange-400 font-bold">{standing.points}</span> bod · Pozicija #{standing.position}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Stats row */}
            {standing && (
              <div className="grid grid-cols-4 gap-2 mb-5">
                {[
                  { label: 'Mečevi', value: standing.played, color: 'text-white' },
                  { label: 'Pobede',  value: standing.won,    color: 'text-green-400' },
                  { label: 'Remiji',  value: standing.drawn,  color: 'text-yellow-400' },
                  { label: 'Porazi',  value: standing.lost,   color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${color} tabular-nums`}>{value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Completed matches */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Odigrani mečevi ({completed.length})
              </p>
              {completed.length === 0 ? (
                <p className="text-xs text-slate-600 py-2">Nema odigranih mečeva.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {completed.map((m) => (
                    <div key={m.matchId} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      m.outcome === 'win' ? 'bg-green-500/8' : m.outcome === 'loss' ? 'bg-red-500/6' : 'bg-yellow-500/6'
                    }`}>
                      <span className={`text-xs font-bold w-3 ${
                        m.outcome === 'win' ? 'text-green-400' : m.outcome === 'loss' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {m.outcome === 'win' ? 'P' : m.outcome === 'loss' ? 'G' : 'R'}
                      </span>
                      <span className="text-sm text-white flex-1 truncate">{m.opponentName}</span>
                      <span className={`text-sm font-bold tabular-nums ${
                        m.outcome === 'win' ? 'text-green-400' : m.outcome === 'loss' ? 'text-red-400' : 'text-yellow-400'
                      }`}>{m.myScore}:{m.oppScore}</span>
                      {m.isWalkover && <span className="text-[10px] px-1 bg-red-500/15 text-red-400 rounded font-bold">WO</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Remaining opponents */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Preostali protivnici ({remaining.length})
              </p>
              {remaining.length === 0 ? (
                <p className="text-xs text-green-400 py-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Svi mečevi odigrani!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {remaining.map((name) => (
                    <span key={name} className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-lg">{name}</span>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

    </div>
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

