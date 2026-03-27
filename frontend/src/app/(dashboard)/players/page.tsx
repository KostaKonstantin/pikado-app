'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { Users, Plus, Search, ChevronRight, Trash2 } from 'lucide-react';

export default function PlayersPage() {
  const { club } = useAuthStore();
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === players.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(players.map((p) => p.id)));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!club?.id) return;
    if (!confirm(`Obrisati igrača "${name}"? Ova akcija se ne može poništiti.`)) return;
    setDeletingId(id);
    try {
      await playersApi.remove(club.id, id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      alert('Greška pri brisanju igrača');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!club?.id || selectedIds.size === 0) return;
    if (!confirm(`Obrisati ${selectedIds.size} igrač(a)? Ova akcija se ne može poništiti.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => playersApi.remove(club.id, id)));
      setPlayers((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch {
      alert('Greška pri brisanju igrača');
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    if (!club?.id) return;
    setLoading(true);
    playersApi.getAll(club.id, search || undefined)
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, [club?.id, search]);

  const allSelected = players.length > 0 && selectedIds.size === players.length;

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
        {/* Search + bulk actions */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="input-field pl-9!"
              placeholder="Pretraži igrače..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedIds(new Set()); }}
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{selectedIds.size} izabrano</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Poništi
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {bulkDeleting
                  ? <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
                Obriši izabrane
              </button>
            </div>
          )}
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
                  <th className="px-4 py-3 w-10">
                    <div
                      onClick={toggleSelectAll}
                      className={`w-4 h-4 rounded border-2 cursor-pointer flex items-center justify-center transition-colors ${allSelected ? 'bg-red-500 border-red-500' : 'border-slate-600 hover:border-slate-400'}`}
                    >
                      {allSelected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                    </div>
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Igrač</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Nadimak</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Zemlja</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-700/40 transition-colors cursor-pointer ${isSelected ? 'bg-red-500/[0.06]' : 'hover:bg-slate-800/40'}`}
                      onClick={() => toggleSelect(p.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div
                          onClick={() => toggleSelect(p.id)}
                          className={`w-4 h-4 rounded border-2 cursor-pointer flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500 border-red-500' : 'border-slate-600 hover:border-slate-400'}`}
                        >
                          {isSelected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/players/${p.id}`} className="flex items-center gap-3 hover:text-orange-400 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                            {p.fullName?.[0]}
                          </div>
                          <span className="font-medium text-white">{p.fullName}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400" onClick={(e) => e.stopPropagation()}>{p.nickname || '—'}</td>
                      <td className="px-4 py-3 text-slate-400" onClick={(e) => e.stopPropagation()}>{p.country || '—'}</td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleDelete(p.id, p.fullName)}
                            disabled={deletingId === p.id}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Obriši igrača"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <Link href={`/players/${p.id}`} className="p-1.5 text-slate-500 hover:text-orange-400" onClick={(e) => e.stopPropagation()}>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
