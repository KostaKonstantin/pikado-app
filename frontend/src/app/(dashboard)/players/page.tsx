'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { Users, Plus, Search, ChevronRight } from 'lucide-react';

export default function PlayersPage() {
  const { club } = useAuthStore();
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club?.id) return;
    setLoading(true);
    playersApi.getAll(club.id, search || undefined)
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, [club?.id, search]);

  return (
    <div>
      <Topbar
        title="Igrači"
        actions={
          <Link href="/players/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Dodaj Igrača
          </Link>
        }
      />
      <div className="p-6">
        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder="Pretraži igrače..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-slate-800" />)}
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-24">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {search ? 'Nema rezultata' : 'Nema Igrača'}
            </h3>
            {!search && (
              <>
                <p className="text-slate-400 mb-6">Dodajte prvog igrača u vaš klub</p>
                <Link href="/players/new" className="btn-primary">
                  <Plus className="w-4 h-4" /> Dodaj Igrača
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs font-medium text-slate-400 px-6 py-3">Igrač</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-6 py-3">Nadimak</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-6 py-3">Zemlja</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="px-6 py-3">
                      <Link href={`/players/${p.id}`} className="flex items-center gap-3 hover:text-orange-400 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                          {p.fullName?.[0]}
                        </div>
                        <span className="font-medium text-white">{p.fullName}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-400">{p.nickname || '—'}</td>
                    <td className="px-6 py-3 text-slate-400">{p.country || '—'}</td>
                    <td className="px-3 py-3">
                      <Link href={`/players/${p.id}`} className="text-slate-500 hover:text-orange-400">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
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
