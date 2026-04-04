'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import {
  Users, Plus, Search, Trash2, X, Loader2,
  LayoutGrid, List, Check, ChevronRight,
} from 'lucide-react';
import { DartAvatar } from '@/components/ui/dart-avatar';

/* ─── skeleton cards ────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card p-4 flex flex-col items-center gap-3 animate-pulse">
      <div className="skeleton w-12 h-12 rounded-2xl" />
      <div className="skeleton h-3.5 w-24 rounded" />
      <div className="skeleton h-2.5 w-16 rounded" />
    </div>
  );
}
function SkeletonRow() {
  return (
    <div className="px-5 py-3.5 flex items-center gap-4 animate-pulse">
      <div className="skeleton w-6 h-4 rounded shrink-0" />
      <div className="skeleton w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-36 rounded" />
        <div className="skeleton h-2.5 w-24 rounded" />
      </div>
      <div className="skeleton h-3 w-16 rounded" />
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────── */
export default function PlayersPage() {
  const { club } = useAuthStore();
  const [players,            setPlayers]            = useState<any[]>([]);
  const [search,             setSearch]             = useState('');
  const [loading,            setLoading]            = useState(true);
  const [deletingId,         setDeletingId]         = useState<string | null>(null);
  const [selectedIds,        setSelectedIds]        = useState<Set<string>>(new Set());
  const [bulkDeleting,       setBulkDeleting]       = useState(false);
  const [confirmBulkDelete,  setConfirmBulkDelete]  = useState(false);
  const [viewMode,           setViewMode]           = useState<'grid' | 'list'>('grid');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!club?.id) return;
    setDeletingId(id);
    try {
      await playersApi.remove(club.id, id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch { /* silently fail */ }
    finally { setDeletingId(null); }
  };

  const handleBulkDelete = async () => {
    if (!club?.id || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => playersApi.remove(club.id!, id)));
      setPlayers((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
    } catch { /* silently fail */ }
    finally { setBulkDeleting(false); }
  };

  useEffect(() => {
    if (!club?.id) return;
    setLoading(true);
    playersApi.getAll(club.id, search || undefined)
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, [club?.id, search]);

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar
        title="Igrači"
        actions={
          <Link href="/players/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Dodaj igrača
          </Link>
        }
      />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">

        {/* ── controls bar ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* search */}
          <div className="flex items-center gap-2 flex-1 min-w-0 input-field px-3 py-2 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedIds(new Set()); }}
              placeholder="Pretraži igrače…"
              className="flex-1 bg-transparent text-sm outline-none text-white placeholder-slate-500 min-w-0"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-white transition-colors" />
              </button>
            )}
          </div>

          {/* count badge */}
          {!loading && (
            <span className="text-xs text-slate-500 hidden sm:block">
              {players.length} igrač{players.length !== 1 ? 'a' : ''}
            </span>
          )}

          <div className="flex items-center gap-1 ml-auto">
            {/* view toggle */}
            <div className="flex items-center rounded-xl overflow-hidden border border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                title="Grid prikaz"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                title="Lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── loading ──────────────────────────────────────────── */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="card overflow-hidden divide-y" style={{ borderColor: 'var(--border)', divideColor: 'var(--border)' }}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )
        ) : players.length === 0 ? (

          /* ── empty state ───────────────────────────────────── */
          <div className="empty-state animate-fade-in-up">
            <div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center mb-5 border border-orange-500/20">
              <Users className="w-9 h-9 text-orange-400/70" />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {search ? `Nema rezultata za "${search}"` : 'Nema igrača'}
            </h3>
            {search ? (
              <button onClick={() => setSearch('')} className="text-sm text-orange-400 hover:text-orange-300 transition-colors mt-1">
                Poništi pretragu
              </button>
            ) : (
              <>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Dodajte prvog igrača u vaš klub
                </p>
                <Link href="/players/new" className="btn-primary">
                  <Plus className="w-4 h-4" /> Dodaj prvog igrača
                </Link>
              </>
            )}
          </div>

        ) : viewMode === 'grid' ? (

          /* ── GRID VIEW ─────────────────────────────────────── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {players.map((p, i) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  style={{ animationDelay: `${i * 25}ms` }}
                  className={`relative card p-4 flex flex-col items-center text-center gap-2.5 cursor-pointer select-none
                    transition-all duration-150 group animate-fade-in-up
                    ${isSelected
                      ? 'ring-2 ring-orange-500 bg-orange-500/[0.06] shadow-lg shadow-orange-500/10'
                      : 'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 hover:bg-slate-800/60'}
                  `}
                  onClick={() => toggleSelect(p.id)}
                >
                  {/* checkbox corner */}
                  <div className={`absolute top-2.5 left-2.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-150
                    ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-600 opacity-0 group-hover:opacity-100'}
                  `}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>

                  {/* avatar */}
                  <DartAvatar name={p.fullName} size="md" />

                  {/* name */}
                  <div className="w-full min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight truncate">{p.fullName}</p>
                    {p.nickname ? (
                      <p className="text-xs text-slate-500 truncate mt-0.5">"{p.nickname}"</p>
                    ) : p.country ? (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{p.country}</p>
                    ) : null}
                  </div>

                  {/* detalji CTA */}
                  <Link
                    href={`/players/${p.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs text-slate-400 hover:text-orange-400 font-medium py-1.5 rounded-lg hover:bg-orange-500/10 transition-all"
                  >
                    Detalji →
                  </Link>
                </div>
              );
            })}
          </div>

        ) : (

          /* ── LIST VIEW ─────────────────────────────────────── */
          <div className="card overflow-hidden animate-fade-in" style={{ padding: 0 }}>
            {players.map((p, i) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  style={{
                    animationDelay: `${i * 18}ms`,
                    borderBottom: i < players.length - 1 ? '1px solid var(--border)' : 'none',
                    borderLeft: isSelected ? '3px solid #f97316' : '3px solid transparent',
                    backgroundColor: isSelected ? 'rgba(249,115,22,0.05)' : undefined,
                  }}
                  className={`relative flex items-center gap-4 px-5 py-3.5 cursor-pointer select-none
                    transition-all duration-150 group animate-fade-in
                    ${!isSelected ? 'hover:bg-slate-800/50' : ''}
                  `}
                  onClick={() => toggleSelect(p.id)}
                >
                  {/* checkbox + row number */}
                  <div className="flex items-center justify-center w-6 shrink-0">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-150 absolute
                      ${isSelected
                        ? 'bg-orange-500 border-orange-500 opacity-100'
                        : 'border-slate-600 opacity-0 group-hover:opacity-100'}
                    `}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-xs font-mono tabular-nums transition-opacity duration-150
                      ${isSelected ? 'opacity-0' : 'text-slate-600 group-hover:opacity-0'}
                    `}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* avatar */}
                  <DartAvatar name={p.fullName} size="md" />

                  {/* name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white truncate leading-tight">{p.fullName}</p>
                      {p.nickname && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.22)' }}>
                          "{p.nickname}"
                        </span>
                      )}
                    </div>
                    {p.country && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{p.country}</p>
                    )}
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 opacity-0 group-hover:opacity-100"
                      title="Obriši"
                    >
                      {deletingId === p.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    <Link
                      href={`/players/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                      style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f97316'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.35)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                    >
                      Profil
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── floating bulk action bar ──────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40">
            <span className="text-sm font-medium text-white whitespace-nowrap">
              {selectedIds.size} izabran{selectedIds.size !== 1 ? 'o' : ''}
            </span>
            <div className="w-px h-4 bg-slate-600" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-700"
            >
              Poništi
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-xl transition-colors font-medium disabled:opacity-50 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Obriši
            </button>
          </div>
        </div>
      )}

      {/* ── bulk delete confirm modal ─────────────────────────────── */}
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
              Da li ste sigurni da želite da obrišete{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {selectedIds.size} igrač{selectedIds.size !== 1 ? 'a' : 'a'}
              </span>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {bulkDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {bulkDeleting ? 'Brisanje...' : 'Da, obriši'}
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
