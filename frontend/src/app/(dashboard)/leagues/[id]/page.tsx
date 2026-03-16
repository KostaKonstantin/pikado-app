'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { ArrowLeft, Plus, Trash2, BarChart3, Users, Calendar, AlertCircle, X, ArrowLeftRight } from 'lucide-react';

type Tab = 'tabela' | 'raspored' | 'igraci';

export default function LeagueDetailPage() {
  const params = useParams();
  const { club, role } = useAuthStore();
  const id = params.id as string;
  const [league, setLeague] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [lPlayers, setLPlayers] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('tabela');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Match result modal
  const [editMatch, setEditMatch] = useState<any>(null);
  const [matchScores, setMatchScores] = useState({ home: 0, away: 0 });

  // Postpone modal
  const [postponeMatch, setPostponeMatch] = useState<any>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeSaving, setPostponeSaving] = useState(false);

  // Substitution modal
  const [subEvening, setSubEvening] = useState<number | null>(null);
  const [subPairs, setSubPairs] = useState<{ absentId: string; substituteId: string }[]>([]);
  const [subPreview, setSubPreview] = useState<{ willPostpone: any[]; willCreate: any[]; willSkip: any[]; warnings: string[] } | null>(null);
  const [subPreviewLoading, setSubPreviewLoading] = useState(false);
  const [subSaving, setSubSaving] = useState(false);

  const canEdit = role === 'club_admin' || role === 'organizer';

  const load = async () => {
    if (!club?.id) return;
    try {
      const [l, s, f, lp, ap] = await Promise.all([
        leaguesApi.getOne(club.id, id),
        leaguesApi.getStandings(club.id, id),
        leaguesApi.getFixtures(club.id, id),
        leaguesApi.getPlayers(club.id, id),
        playersApi.getAll(club.id),
      ]);
      setLeague(l); setStandings(s); setFixtures(f); setLPlayers(lp); setAllPlayers(ap);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [club?.id, id]);

  const addPlayer = async (playerId: string) => { await leaguesApi.addPlayer(club!.id, id, playerId); load(); };
  const removePlayer = async (playerId: string) => { await leaguesApi.removePlayer(club!.id, id, playerId); load(); };

  const generate = async () => {
    if (lPlayers.length < 2) { alert('Potrebna su najmanje 2 igrača'); return; }
    setGenerating(true);
    try { await leaguesApi.generateFixtures(club!.id, id); load(); } finally { setGenerating(false); }
  };

  const matchScoreError = (() => {
    if (!editMatch || !league) return '';
    const max = league.setsPerMatch === 1 ? league.legsPerSet : league.setsPerMatch;
    const { home, away } = matchScores;
    if (home < 0 || away < 0) return 'Rezultat ne može biti negativan';
    if (home > max || away > max) return `Maksimum je ${max}`;
    if (home === 0 && away === 0) return 'Rezultat ne može biti 0:0';
    const decisive = Math.max(home, away) === max;
    const draw = home === away && home === max - 1;
    if (!decisive && !draw) return `Pobeda: ${max}:0 – ${max}:${max - 1} | Remi: ${max - 1}:${max - 1}`;
    return '';
  })();

  const saveMatchResult = async () => {
    if (!editMatch || matchScoreError) return;
    await leaguesApi.updateMatch(club!.id, id, editMatch.id, matchScores.home, matchScores.away);
    setEditMatch(null); load();
  };

  const savePostpone = async () => {
    if (!postponeMatch || !club?.id) return;
    setPostponeSaving(true);
    try {
      await leaguesApi.postponeMatch(club.id, id, postponeMatch.id, {
        scheduledDate: postponeDate || null,
        isPostponed: true,
      });
      setPostponeMatch(null); setPostponeDate(''); load();
    } finally { setPostponeSaving(false); }
  };

  const cancelPostpone = async (match: any) => {
    if (!club?.id) return;
    await leaguesApi.postponeMatch(club.id, id, match.id, { scheduledDate: null, isPostponed: false });
    load();
  };

  const openSubstitute = (eveningNum: number) => {
    setSubEvening(eveningNum);
    setSubPairs([{ absentId: '', substituteId: '' }]);
    setSubPreview(null);
  };

  const closeSubstitute = () => {
    setSubEvening(null);
    setSubPairs([]);
    setSubPreview(null);
  };

  const updateSubPair = (index: number, field: 'absentId' | 'substituteId', value: string) => {
    const updated = subPairs.map((p, i) => i === index ? { ...p, [field]: value } : p);
    setSubPairs(updated);
    setSubPreview(null);
    const complete = updated.filter(p => p.absentId && p.substituteId);
    if (complete.length === 0) return;
    setSubPreviewLoading(true);
    leaguesApi.previewSubstitutions(club!.id, id, subEvening!, complete)
      .then(setSubPreview)
      .catch(() => setSubPreview(null))
      .finally(() => setSubPreviewLoading(false));
  };

  const addSubPair = () => setSubPairs([...subPairs, { absentId: '', substituteId: '' }]);

  const removeSubPair = (index: number) => {
    const updated = subPairs.filter((_, i) => i !== index);
    setSubPairs(updated);
    setSubPreview(null);
  };

  const saveSubstitute = async () => {
    const complete = subPairs.filter(p => p.absentId && p.substituteId);
    if (!subEvening || complete.length === 0 || !club?.id) return;
    setSubSaving(true);
    try {
      await leaguesApi.applySubstitutions(club.id, id, subEvening, complete);
      closeSubstitute(); load();
    } finally { setSubSaving(false); }
  };

  // Group fixtures by evening (sessionNumber)
  const byEvening: Record<number, any[]> = {};
  for (const m of fixtures) {
    const s = m.sessionNumber ?? 1;
    if (!byEvening[s]) byEvening[s] = [];
    byEvening[s].push(m);
  }

  const registeredIds = new Set(lPlayers.map((lp) => lp.playerId));
  const availablePlayers = allPlayers.filter((p) => !registeredIds.has(p.id));

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Učitavanje...</div>;
  if (!league) return null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'tabela', label: 'Tabela' },
    { id: 'raspored', label: 'Raspored' },
    { id: 'igraci', label: 'Igrači' },
  ];

  return (
    <div>
      <Topbar title={league.name} />
      <div className="p-6 space-y-6">
        <Link href="/leagues" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Sve lige
        </Link>

        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TABELA */}
        {tab === 'tabela' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" /> Tabela
              </h3>
              {canEdit && (
                <button onClick={generate} disabled={generating} className="btn-primary text-sm">
                  {generating ? 'Generisanje...' : fixtures.length > 0 ? 'Regeneriši Raspored' : 'Generiši Raspored'}
                </button>
              )}
            </div>
            {standings.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p>Nema podataka. Dodajte igrače i generišite raspored.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {['#', 'Igrač', 'M', 'P', 'G', 'R', 'Odl.', 'S+', 'S-', 'Bod.'].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-slate-400 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr key={s.player?.id || s.position} className="table-row">
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${s.position === 1 ? 'bg-yellow-500 text-black' : s.position === 2 ? 'bg-slate-400 text-black' : s.position === 3 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'}`}>{s.position}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{s.player?.fullName}</td>
                        <td className="px-4 py-3 text-slate-300">{s.played}</td>
                        <td className="px-4 py-3 text-green-400">{s.won}</td>
                        <td className="px-4 py-3 text-red-400">{s.lost}</td>
                        <td className="px-4 py-3 text-slate-300">{s.drawn}</td>
                        <td className="px-4 py-3">
                          {s.postponed > 0
                            ? <span className="text-amber-400 font-medium">{s.postponed}</span>
                            : <span className="text-slate-600">0</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{s.setsFor}</td>
                        <td className="px-4 py-3 text-slate-300">{s.setsAgainst}</td>
                        <td className="px-4 py-3 font-bold text-orange-400">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* RASPORED */}
        {tab === 'raspored' && (
          <div className="space-y-4">
            {Object.keys(byEvening).length === 0 ? (
              <div className="card p-8 text-center text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="mb-4">Raspored nije generisan</p>
                {canEdit && (
                  <button onClick={generate} disabled={generating} className="btn-primary">
                    {generating ? 'Generisanje...' : 'Generiši Raspored'}
                  </button>
                )}
              </div>
            ) : (
              Object.entries(byEvening)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([evening, matches]) => {
                  const completedCount = matches.filter((m: any) => m.status === 'completed').length;
                  const postponedCount = matches.filter((m: any) => m.isPostponed && m.status !== 'completed').length;
                  const pendingCount = matches.length - completedCount;
                  const allDone = completedCount === matches.length;

                  return (
                    <div key={evening} className="card overflow-hidden">
                      {/* Evening header */}
                      <div className={`px-5 py-4 border-b border-slate-700 ${allDone ? 'bg-green-500/5' : 'bg-slate-800/60'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                              allDone ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-white'
                            }`}>
                              {evening}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">Večer {evening}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-400">
                                  {completedCount}/{matches.length} odigrano
                                </span>
                                {postponedCount > 0 && (
                                  <span className="text-xs text-amber-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />{postponedCount} odloženo
                                  </span>
                                )}
                                {allDone && <span className="text-xs text-green-400 font-medium">Završena večer</span>}
                              </div>
                            </div>
                          </div>
                          {canEdit && pendingCount > 0 && (
                            <button
                              onClick={() => openSubstitute(Number(evening))}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors shrink-0 font-medium">
                              <ArrowLeftRight className="w-3.5 h-3.5" /> Zamena
                            </button>
                          )}
                        </div>

                        {/* Progress bar */}
                        {matches.length > 0 && (
                          <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500/60 rounded-full transition-all"
                              style={{ width: `${(completedCount / matches.length) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Match list — flat, no tura grouping */}
                      <div className="divide-y divide-slate-700/40">
                        {matches.map((m: any, idx: number) => {
                          const completed = m.status === 'completed';
                          const homeWon = completed && m.homeSets > m.awaySets;
                          const awayWon = completed && m.awaySets > m.homeSets;
                          const isDraw = completed && m.homeSets === m.awaySets;
                          return (
                            <div key={m.id} className={`flex items-center px-5 py-3 gap-3 transition-colors ${
                              completed ? 'bg-green-500/[0.03]' : m.isPostponed ? 'bg-amber-500/5' : 'hover:bg-slate-800/40'
                            }`}>
                              {/* Match index */}
                              <span className="text-xs text-slate-700 w-4 shrink-0 select-none">{idx + 1}</span>

                              {/* Home player */}
                              <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                                {m.isPostponed && !completed && (
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                )}
                                <span className={`text-sm text-right font-medium truncate ${
                                  homeWon ? 'text-white' : completed ? 'text-slate-500' : 'text-white'
                                }`}>
                                  {m.homePlayer?.fullName}
                                </span>
                                {homeWon && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
                              </div>

                              {/* Score / VS */}
                              <div className="w-16 text-center shrink-0">
                                {completed ? (
                                  <span className={`text-sm font-bold tabular-nums ${isDraw ? 'text-slate-300' : 'text-orange-400'}`}>
                                    {m.homeSets} : {m.awaySets}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-600">—</span>
                                )}
                              </div>

                              {/* Away player */}
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                {awayWon && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
                                <span className={`text-sm font-medium truncate ${
                                  awayWon ? 'text-white' : completed ? 'text-slate-500' : 'text-white'
                                }`}>
                                  {m.awayPlayer?.fullName}
                                </span>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                {m.scheduledDate && !completed && (
                                  <span className="text-xs text-amber-400 flex items-center gap-1 mr-1">
                                    <Calendar className="w-3 h-3" />{formatDate(m.scheduledDate)}
                                  </span>
                                )}
                                {canEdit && !completed && (
                                  <>
                                    <button
                                      onClick={() => { setEditMatch(m); setMatchScores({ home: 0, away: 0 }); }}
                                      className="text-xs px-3 py-1 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg transition-colors font-medium">
                                      Unesi
                                    </button>
                                    {m.isPostponed
                                      ? <button onClick={() => cancelPostpone(m)} className="p-1.5 text-amber-400 hover:text-amber-300 rounded transition-colors" title="Otkaži odlaganje"><X className="w-3.5 h-3.5" /></button>
                                      : <button onClick={() => { setPostponeMatch(m); setPostponeDate(''); }} className="p-1.5 text-slate-500 hover:text-orange-400 rounded transition-colors" title="Odloži meč"><Calendar className="w-3.5 h-3.5" /></button>
                                    }
                                  </>
                                )}
                                {canEdit && completed && (
                                  <button
                                    onClick={() => { setEditMatch(m); setMatchScores({ home: m.homeSets, away: m.awaySets }); }}
                                    className="text-xs px-2 py-1 text-slate-600 hover:text-slate-300 rounded transition-colors">
                                    Ispravi
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* IGRAČI */}
        {tab === 'igraci' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> Igrači ({lPlayers.length})</h3>
            </div>
            {canEdit && availablePlayers.length > 0 && (
              <div className="mb-4 p-3 bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">Dodaj igrača:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availablePlayers.map((p) => (
                    <button key={p.id} onClick={() => addPlayer(p.id)} className="text-left p-2 rounded bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors flex items-center gap-2">
                      <Plus className="w-3 h-3 text-orange-400" /> {p.fullName}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {lPlayers.map((lp) => (
                <div key={lp.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">{lp.player?.fullName?.[0]}</div>
                    <span className="text-sm text-white">{lp.player?.fullName}</span>
                  </div>
                  {canEdit && <button onClick={() => removePlayer(lp.playerId)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Unesi Rezultat */}
        {editMatch && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditMatch(null)}>
            <div className="card p-6 w-80" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-white mb-4">{editMatch.status === 'completed' ? 'Ispravi Rezultat' : 'Unesi Rezultat'}</h3>
              {(() => {
                const max = league.setsPerMatch === 1 ? league.legsPerSet : league.setsPerMatch;
                return (
                  <>
                    <p className="text-xs text-slate-400 mb-3">Maks. po igraču: <span className="text-white font-medium">{max}</span></p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-slate-400 mb-1">Domaćin</p>
                        <p className="text-sm font-medium text-white">{editMatch.homePlayer?.fullName}</p>
                        <input type="number" className="input-field text-center mt-2" min={0} max={max} value={matchScores.home}
                          onChange={(e) => setMatchScores({ ...matchScores, home: parseInt(e.target.value) || 0 })} />
                      </div>
                      <span className="text-slate-400 text-lg font-bold">:</span>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-slate-400 mb-1">Gost</p>
                        <p className="text-sm font-medium text-white">{editMatch.awayPlayer?.fullName}</p>
                        <input type="number" className="input-field text-center mt-2" min={0} max={max} value={matchScores.away}
                          onChange={(e) => setMatchScores({ ...matchScores, away: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </>
                );
              })()}
              {matchScoreError && (
                <p className="text-xs text-red-400 text-center mb-3">{matchScoreError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={saveMatchResult} disabled={!!matchScoreError} className="btn-primary flex-1 justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed">Sačuvaj</button>
                <button onClick={() => setEditMatch(null)} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Odloži Meč */}
        {postponeMatch && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setPostponeMatch(null)}>
            <div className="card p-6 w-96" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-white mb-1">Odloži Meč</h3>
              <p className="text-sm text-slate-400 mb-4">{postponeMatch.homePlayer?.fullName} vs {postponeMatch.awayPlayer?.fullName}</p>
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">Novi datum (opciono)</label>
                <input type="datetime-local" className="input-field" value={postponeDate} onChange={(e) => setPostponeDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={savePostpone} disabled={postponeSaving} className="btn-primary flex-1 justify-center text-sm">
                  {postponeSaving ? 'Čuvanje...' : 'Odloži'}
                </button>
                <button onClick={() => setPostponeMatch(null)} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Zamena Igrača */}
        {subEvening !== null && (() => {
          const eveningMatches = byEvening[subEvening] || [];
          const eveningPlayerMap = new Map<string, string>(
            eveningMatches.flatMap((m: any) => [
              [m.homePlayerId, m.homePlayer?.fullName],
              [m.awayPlayerId, m.awayPlayer?.fullName],
            ])
          );
          const eveningIds = new Set(eveningPlayerMap.keys());
          const selectedAbsentIds = new Set(subPairs.map(p => p.absentId).filter(Boolean));
          const selectedSubIds = new Set(subPairs.map(p => p.substituteId).filter(Boolean));

          const getPlayerName = (pid: string) => {
            if (eveningPlayerMap.has(pid)) return eveningPlayerMap.get(pid);
            return lPlayers.find((lp: any) => lp.playerId === pid)?.player?.fullName ?? pid;
          };

          const completePairs = subPairs.filter(p => p.absentId && p.substituteId);
          const canConfirm = completePairs.length > 0 && !subSaving;

          return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeSubstitute}>
              <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-blue-400" /> Zamene igrača
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Večer {subEvening}</p>
                  </div>
                  <button onClick={closeSubstitute} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                {/* Pairs */}
                <div className="space-y-3">
                  {subPairs.map((pair, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-1">Odsutan</p>
                        <select className="input-field text-sm" value={pair.absentId}
                          onChange={(e) => updateSubPair(i, 'absentId', e.target.value)}>
                          <option value="">— Izaberi —</option>
                          {[...eveningPlayerMap.entries()].map(([pid, name]) => {
                            const takenByOther = selectedAbsentIds.has(pid) && pair.absentId !== pid;
                            if (takenByOther) return null;
                            return <option key={pid} value={pid}>{name}</option>;
                          })}
                        </select>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-slate-500 shrink-0 mt-4" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-1">Zamena</p>
                        <select className="input-field text-sm" value={pair.substituteId}
                          onChange={(e) => updateSubPair(i, 'substituteId', e.target.value)}>
                          <option value="">— Izaberi —</option>
                          {lPlayers
                            .map((lp: any) => lp.player)
                            .filter((p: any) => {
                              if (!p) return false;
                              if (eveningIds.has(p.id) && !selectedAbsentIds.has(p.id)) return false;
                              if (selectedSubIds.has(p.id) && pair.substituteId !== p.id) return false;
                              return true;
                            })
                            .map((p: any) => <option key={p.id} value={p.id}>{p.fullName}</option>)
                          }
                        </select>
                      </div>
                      {subPairs.length > 1 && (
                        <button onClick={() => removeSubPair(i)} className="mt-4 p-1 text-slate-500 hover:text-red-400 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={addSubPair}
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Dodaj još jednu zamenu
                </button>

                {/* Preview */}
                {(subPreviewLoading || subPreview) && (
                  <div className="mt-4 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-800/70 border-b border-slate-700">
                      <p className="text-xs font-medium text-slate-300">Pregled zamene</p>
                    </div>
                    {subPreviewLoading && <p className="text-xs text-slate-500 p-3">Učitavanje...</p>}
                    {subPreview && !subPreviewLoading && (
                      <div className="p-3 space-y-3">
                        {/* Warnings */}
                        {subPreview.warnings.map((w: string, i: number) => {
                          const subId = w.split(':')[0];
                          return (
                            <div key={i} className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{getPlayerName(subId)} nema novih protivnika ove večeri — svi mečevi su već odigrani ili zakazani.</span>
                            </div>
                          );
                        })}

                        {/* Postponed */}
                        {subPreview.willPostpone.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Odlažu se ({subPreview.willPostpone.length}) — igrači ostaju dužni</p>
                            <div className="space-y-1">
                              {subPreview.willPostpone.map((m: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="text-amber-400">↷</span>
                                  <span className="text-amber-300/80">{getPlayerName(m.homePlayerId)} <span className="text-slate-600">vs</span> {getPlayerName(m.awayPlayerId)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Moved matches */}
                        {subPreview.willMove?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Premešta se na ovu večer ({subPreview.willMove.length})</p>
                            <div className="space-y-1">
                              {subPreview.willMove.map((m: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="text-blue-400">→</span>
                                  <span className="text-blue-300/80">{getPlayerName(m.homePlayerId)} <span className="text-slate-600">vs</span> {getPlayerName(m.awayPlayerId)}</span>
                                  <span className="text-slate-600">(bila večer {m.fromEvening})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* New matches */}
                        {subPreview.willCreate.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Novi mečevi ({subPreview.willCreate.length})</p>
                            <div className="space-y-1">
                              {subPreview.willCreate.map((m: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="text-green-400">+</span>
                                  <span className="text-green-300/80">{getPlayerName(m.homePlayerId)} <span className="text-slate-600">vs</span> {getPlayerName(m.awayPlayerId)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Skipped */}
                        {subPreview.willSkip.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Preskočeni ({subPreview.willSkip.length})</p>
                            <div className="space-y-1">
                              {subPreview.willSkip.map((m: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-600">✗</span>
                                  <span className="text-slate-600 line-through">{getPlayerName(m.homePlayerId)} vs {getPlayerName(m.awayPlayerId)}</span>
                                  <span className="text-slate-700 ml-1">{m.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {subPreview.willCreate.length === 0 && (subPreview.willMove?.length ?? 0) === 0 && subPreview.warnings.length === 0 && (
                          <p className="text-xs text-red-400">Nema novih mečeva — izaberi drugog igrača.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-5">
                  <button onClick={saveSubstitute} disabled={!canConfirm}
                    className="btn-primary flex-1 justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {subSaving ? 'Čuvanje...' : 'Potvrdi zamene'}
                  </button>
                  <button onClick={closeSubstitute} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
