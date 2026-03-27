'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Target, RefreshCw, Trophy } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchStandings(slug: string) {
  const res = await fetch(`${API_URL}/api/leagues/by-slug/${slug}/standings`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Liga nije pronađena');
  return res.json();
}

function RankBadge({ pos }: { pos: number }) {
  const cls =
    pos === 1 ? 'bg-yellow-400 text-black' :
    pos === 2 ? 'bg-slate-300 text-black' :
    pos === 3 ? 'bg-amber-600 text-white' :
                'bg-slate-700 text-slate-300';
  return (
    <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold shrink-0 ${cls}`}>
      {pos}
    </span>
  );
}

export default function PublicLeaguePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData]       = useState<any>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchStandings(slug);
      setData(d);
      setLastUpdated(new Date());
      setError('');
    } catch {
      setError('Liga nije pronađena ili je došlo do greške.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-orange-500 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-orange-100 font-medium">Pikado App · Liga</p>
            <h1 className="text-lg font-bold text-white truncate">
              {loading ? '...' : (data?.league?.name ?? 'Nepoznata liga')}
            </h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Osveži"
          >
            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {error ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">{error}</p>
          </div>
        ) : loading && !data ? (
          <div className="space-y-2 mt-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Standings table */}
            <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Column headers */}
              <div className="grid grid-cols-[2.5rem_1fr_2.5rem_2.5rem_2.5rem_3rem] gap-x-2 px-4 py-2.5 border-b border-slate-700 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                <span className="text-center">#</span>
                <span>Igrač</span>
                <span className="text-center">M</span>
                <span className="text-center text-green-400">P</span>
                <span className="text-center text-red-400">G</span>
                <span className="text-right text-orange-400">Bod</span>
              </div>

              {data?.standings?.map((s: any, idx: number) => {
                const isTop3 = s.position <= 3;
                return (
                  <div
                    key={s.player?.id ?? idx}
                    className={`grid grid-cols-[2.5rem_1fr_2.5rem_2.5rem_2.5rem_3rem] gap-x-2 items-center px-4 py-3 border-b border-slate-700/50 last:border-0 ${
                      isTop3 ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className="flex justify-center">
                      <RankBadge pos={s.position} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.player?.fullName ?? '—'}</p>
                      {s.played > 0 && (
                        <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                          {s.setsFor}:{s.setsAgainst} legova
                        </p>
                      )}
                    </div>
                    <span className="text-center text-sm text-slate-400 tabular-nums">{s.played}</span>
                    <span className="text-center text-sm text-green-400 tabular-nums font-medium">{s.won}</span>
                    <span className="text-center text-sm text-red-400 tabular-nums font-medium">{s.lost}</span>
                    <span className="text-right text-sm font-bold text-orange-400 tabular-nums">{s.points}</span>
                  </div>
                );
              })}
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <p className="text-center text-xs text-slate-600 mt-4">
                Poslednje osveženo: {lastUpdated.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {' · '}Auto-osvežava se svaki minut
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
