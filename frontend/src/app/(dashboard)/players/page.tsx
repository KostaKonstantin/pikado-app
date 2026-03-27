'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { Users, Plus, Search, ChevronRight, Trash2, X, Loader2 } from 'lucide-react';

function PlayerAvatar({ name }: { name: string }) {
  const letter = name?.[0]?.toUpperCase() || '?';
  const colors = [
    'bg-blue-500/20 text-blue-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-purple-500/20 text-purple-400',
    'bg-orange-500/20 text-orange-400',
    'bg-pink-500/20 text-pink-400',
    'bg-cyan-500/20 text-cyan-400',
  ];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-sm font-bold shrink-0`}>
      {letter}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
      <td className="px-4 py-3 w-10"><div className="skeleton w-4 h-4 rounded" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="skeleton h-4 w-28 rounded" />
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell"><div className="skeleton h-3 w-16 rounded" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><div className="skeleton h-3 w-12 rounded" /></td>
      <td className="px-3 py-3 w-20" />
    </tr>
  );
}

export default function PlayersPage() {
  const { club } = useAuthStore();
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!club?.id) return;
    setDeletingId(id);
    try {
      await playersApi.remove(club.id, id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!club?.id || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => playersApi.remove(club.id, id)));
      setPlayers((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
    } catch {
      // silently fail
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar
        title="Igrači"
        actions={
          <Link href="/players/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Dodaj Igrača
          </Link>
        }
      />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        {/* Search + bulk actions bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Pretraži igrače..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedIds(new Set()); }}
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {selectedIds.size} izabrano
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Poništi
              </button>
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Obriši izabrane
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-3 w-10" />
                  <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Igrač</th>
                  <th className="text-left text-xs font-medium px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Nadimak</th>
                  <th className="text-left text-xs font-medium px-4 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Zemlja</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : players.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-5 border border-emerald-500/20">
              <Users className="w-9 h-9 text-emerald-400/70" />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {search ? 'Nema rezultata' : 'Nema Igrača'}
            </h3>
            {!search && (
              <>
                <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                  Dodajte prvog igrača u vaš klub
                </p>
                <Link href="/players/new" className="btn-primary">
                  <Plus className="w-4 h-4" /> Dodaj Igrača
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden animate-fade-in-up">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-3 w-10">
                    <div
                      onClick={toggleSelectAll}
                      className={`w-4 h-4 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${
                        allSelected
                          ? 'bg-red-500 border-red-500'
                          : 'hover:border-slate-400'
                      }`}
                      style={!allSelected ? { borderColor: 'var(--border)' } : undefined}
                    >
                      {allSelected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                    </div>
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Igrač</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Nadimak</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Zemlja</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors cursor-pointer animate-fade-in`}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: isSelected ? 'rgba(239,68,68,0.05)' : undefined,
                        animationDelay: `${i * 30}ms`,
                      }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-secondary)'; }}
                      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                      onClick={() => toggleSelect(p.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div
                          onClick={() => toggleSelect(p.id)}
                          className={`w-4 h-4 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${
                            isSelected ? 'bg-red-500 border-red-500' : 'hover:border-slate-400'
                          }`}
                          style={!isSelected ? { borderColor: 'var(--border)' } : undefined}
                        >
                          {isSelected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/players/${p.id}`} className="flex items-center gap-3 group">
                          <PlayerAvatar name={p.fullName} />
                          <span className="font-medium transition-colors group-hover:text-orange-400" style={{ color: 'var(--text-primary)' }}>
                            {p.fullName}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-sm" style={{ color: 'var(--text-secondary)' }} onClick={(e) => e.stopPropagation()}>
                        {p.nickname || <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm" style={{ color: 'var(--text-secondary)' }} onClick={(e) => e.stopPropagation()}>
                        {p.country || <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded-lg transition-all hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Obriši igrača"
                          >
                            {deletingId === p.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                          <Link
                            href={`/players/${p.id}`}
                            className="p-1.5 rounded-lg transition-all hover:bg-orange-500/10 hover:text-orange-400"
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer count */}
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {players.length} igrač{players.length !== 1 ? 'a' : ''}
              </span>
              {selectedIds.size > 0 && (
                <span className="text-xs text-red-400">
                  {selectedIds.size} izabrano
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk delete confirm modal */}
      {confirmBulkDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={() => setConfirmBulkDelete(false)}
        >
          <div className="card p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Obriši igrače</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Ova radnja je nepovratna</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Da li ste sigurni da želite da obrišete <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedIds.size} igrač{selectedIds.size !== 1 ? 'a' : 'a'}</span>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {bulkDeleting ? 'Brisanje...' : 'Da, obriši sve'}
              </button>
              <button
                onClick={() => setConfirmBulkDelete(false)}
                className="flex-1 py-2.5 px-4 text-sm font-medium rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
