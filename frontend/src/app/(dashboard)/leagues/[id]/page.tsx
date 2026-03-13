'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { ArrowLeft, Plus, Trash2, Trophy, Users, BarChart3 } from 'lucide-react';

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
  const [editMatch, setEditMatch] = useState<any>(null);
  const [matchScores, setMatchScores] = useState({ home: 0, away: 0 });

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
      setLeague(l);
      setStandings(s);
      setFixtures(f);
      setLPlayers(lp);
      setAllPlayers(ap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [club?.id, id]);

  const addPlayer = async (playerId: string) => {
    await leaguesApi.addPlayer(club!.id, id, playerId);
    load();
  };

  const removePlayer = async (playerId: string) => {
    await leaguesApi.removePlayer(club!.id, id, playerId);
    load();
  };

  const generate = async () => {
    if (lPlayers.length < 2) { alert('Potrebna su najmanje 2 igrača'); return; }
    setGenerating(true);
    try {
      await leaguesApi.generateFixtures(club!.id, id);
      load();
    } finally {
      setGenerating(false);
    }
  };

  const saveMatchResult = async () => {
    if (!editMatch) return;
    await leaguesApi.updateMatch(club!.id, id, editMatch.id, matchScores.home, matchScores.away);
    setEditMatch(null);
    load();
  };

  const registeredIds = new Set(lPlayers.map((lp) => lp.playerId));
  const availablePlayers = allPlayers.filter((p) => !registeredIds.has(p.id));

  // Group fixtures by round
  const fixturesByRound = fixtures.reduce((acc: Record<number, any[]>, f) => {
    if (!acc[f.roundNumber]) acc[f.roundNumber] = [];
    acc[f.roundNumber].push(f);
    return acc;
  }, {});

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

        {/* Tab Nav */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Standings Tab */}
        {tab === 'tabela' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" /> Tabela
              </h3>
              {canEdit && league.status === 'draft' && (
                <button onClick={generate} disabled={generating} className="btn-primary text-sm">
                  {generating ? 'Generisanje...' : 'Generiši Raspored'}
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
                      {['#', 'Igrač', 'M', 'P', 'G', 'R', 'S+', 'S-', 'Bod.'].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-slate-400 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr key={s.player?.id || s.position} className="table-row">
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                            s.position === 1 ? 'bg-yellow-500 text-black' :
                            s.position === 2 ? 'bg-slate-400 text-black' :
                            s.position === 3 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'
                          }`}>{s.position}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{s.player?.fullName}</td>
                        <td className="px-4 py-3 text-slate-300">{s.played}</td>
                        <td className="px-4 py-3 text-green-400">{s.won}</td>
                        <td className="px-4 py-3 text-red-400">{s.lost}</td>
                        <td className="px-4 py-3 text-slate-300">{s.drawn}</td>
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

        {/* Fixtures Tab */}
        {tab === 'raspored' && (
          <div className="space-y-4">
            {Object.keys(fixturesByRound).length === 0 ? (
              <div className="card p-8 text-center text-slate-400">
                <p>Raspored nije generisan</p>
                {canEdit && (
                  <button onClick={generate} disabled={generating} className="btn-primary mt-4">
                    {generating ? 'Generisanje...' : 'Generiši Raspored'}
                  </button>
                )}
              </div>
            ) : (
              Object.entries(fixturesByRound).map(([round, matches]) => (
                <div key={round} className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                    <h4 className="text-sm font-semibold text-slate-300">Kolo {round}</h4>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {(matches as any[]).map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-white flex-1 text-right">{m.homePlayer?.fullName}</span>
                        <div className="mx-4 flex items-center gap-2">
                          {m.status === 'completed' ? (
                            <span className="text-lg font-bold text-white">{m.homeSets} : {m.awaySets}</span>
                          ) : (
                            <span className="text-sm text-slate-500 px-3">vs</span>
                          )}
                        </div>
                        <span className="text-sm text-white flex-1">{m.awayPlayer?.fullName}</span>
                        {canEdit && m.status !== 'completed' && (
                          <button
                            onClick={() => { setEditMatch(m); setMatchScores({ home: 0, away: 0 }); }}
                            className="ml-4 text-xs btn-secondary py-1 px-2">
                            Unesi
                          </button>
                        )}
                        {m.status === 'completed' && (
                          <span className="ml-4 badge badge-win text-xs">Završen</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Players Tab */}
        {tab === 'igraci' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" /> Igrači ({lPlayers.length})
              </h3>
            </div>
            {canEdit && availablePlayers.length > 0 && (
              <div className="mb-4 p-3 bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">Dodaj igrača:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availablePlayers.map((p) => (
                    <button key={p.id} onClick={() => addPlayer(p.id)}
                      className="text-left p-2 rounded bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors flex items-center gap-2">
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
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                      {lp.player?.fullName?.[0]}
                    </div>
                    <span className="text-sm text-white">{lp.player?.fullName}</span>
                  </div>
                  {canEdit && (
                    <button onClick={() => removePlayer(lp.playerId)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match Result Modal */}
        {editMatch && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditMatch(null)}>
            <div className="card p-6 w-80" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-white mb-4">Unesi Rezultat</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 text-center">
                  <p className="text-xs text-slate-400 mb-1">Domaćin</p>
                  <p className="text-sm font-medium text-white">{editMatch.homePlayer?.fullName}</p>
                  <input type="number" className="input-field text-center mt-2" min={0} value={matchScores.home}
                    onChange={(e) => setMatchScores({ ...matchScores, home: parseInt(e.target.value) || 0 })} />
                </div>
                <span className="text-slate-400 text-lg font-bold">:</span>
                <div className="flex-1 text-center">
                  <p className="text-xs text-slate-400 mb-1">Gost</p>
                  <p className="text-sm font-medium text-white">{editMatch.awayPlayer?.fullName}</p>
                  <input type="number" className="input-field text-center mt-2" min={0} value={matchScores.away}
                    onChange={(e) => setMatchScores({ ...matchScores, away: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveMatchResult} className="btn-primary flex-1 justify-center text-sm">Sačuvaj</button>
                <button onClick={() => setEditMatch(null)} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
