'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { rankingsApi } from '@/lib/api/rankings.api';
import { seasonsApi } from '@/lib/api/seasons.api';
import { Topbar } from '@/components/layout/topbar';
import { BarChart3, RefreshCw } from 'lucide-react';

export default function RankingsPage() {
  const { club } = useAuthStore();
  const [rankings, setRankings] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const load = () => {
    if (!club?.id) return;
    setLoading(true);
    rankingsApi.get(club.id, seasonId || undefined)
      .then(setRankings)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!club?.id) return;
    seasonsApi.getAll(club.id).then(setSeasons);
    load();
  }, [club?.id]);

  useEffect(() => { load(); }, [seasonId]);

  const recalculate = async () => {
    if (!club?.id) return;
    setRecalculating(true);
    await rankingsApi.recalculate(club.id);
    load();
    setRecalculating(false);
  };

  return (
    <div>
      <Topbar
        title="Rang Lista"
        actions={
          <button onClick={recalculate} disabled={recalculating} className="btn-secondary text-sm">
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            Preračunaj
          </button>
        }
      />
      <div className="p-6">
        {/* Season filter */}
        {seasons.length > 0 && (
          <div className="mb-6">
            <select
              className="input-field max-w-xs"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
            >
              <option value="">Sveukupno</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="card h-14 animate-pulse bg-slate-800" />)}
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-24">
            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nema Podataka</h3>
            <p className="text-slate-400">Odigrajte mečeve da biste videli rang listu</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Poz.', 'Igrač', 'Mečevi', 'Pobede', 'Porazi', '% Pobeda', 'Bodovi'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-400 px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => (
                  <tr key={r.player?.id || r.position} className="table-row">
                    <td className="px-6 py-4">
                      <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                        r.position === 1 ? 'bg-yellow-500 text-black' :
                        r.position === 2 ? 'bg-slate-400 text-black' :
                        r.position === 3 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>{r.position}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                          {r.player?.fullName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{r.player?.fullName}</p>
                          {r.player?.nickname && <p className="text-xs text-slate-400">"{r.player.nickname}"</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{r.matchesPlayed}</td>
                    <td className="px-6 py-4 text-green-400">{r.matchesWon}</td>
                    <td className="px-6 py-4 text-red-400">{r.matchesLost}</td>
                    <td className="px-6 py-4 text-slate-300">{r.winRate}%</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-orange-400 text-base">{r.points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
