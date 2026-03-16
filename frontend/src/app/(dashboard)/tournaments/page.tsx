'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { tournamentsApi } from '@/lib/api/tournaments.api';
import { Topbar } from '@/components/layout/topbar';
import { Trophy, Plus, Users, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Ispadanje',
  double_elimination: 'Dvostruko Ispadanje',
  round_robin: 'Kružni Sistem',
  group_knockout: 'Grupe + Ispadanje',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nacrt',
  registration: 'Registracija',
  in_progress: 'U toku',
  completed: 'Završen',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  registration: 'bg-orange-500/20 text-orange-400',
  in_progress: 'bg-green-500/20 text-green-400',
  completed: 'bg-slate-700 text-slate-400',
};

export default function TournamentsPage() {
  const { club } = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!club?.id) return;
    tournamentsApi.getAll(club.id)
      .then(setTournaments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [club?.id]);

  const handleDelete = async () => {
    if (!confirmDelete || !club?.id) return;
    setDeletingId(confirmDelete.id);
    try {
      await tournamentsApi.remove(club.id, confirmDelete.id);
      setTournaments((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <Topbar
        title="Turniri"
        actions={
          <Link href="/tournaments/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Kreiraj Turnir
          </Link>
        }
      />
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card p-6 h-40 animate-pulse bg-slate-800" />)}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-24">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nema Turnira</h3>
            <p className="text-slate-400 mb-6">Kreirajte prvi turnir za vaš klub</p>
            <Link href="/tournaments/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Kreiraj Turnir
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <div key={t.id} className="card hover:border-slate-600 transition-all group flex flex-col">
                {/* Clickable body */}
                <Link href={`/tournaments/${t.id}`} className="block p-5 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors truncate">{t.name}</h3>
                      <p className="text-slate-500 text-xs">{FORMAT_LABELS[t.format] || t.format}</p>
                    </div>
                    <span className={`badge text-xs shrink-0 ${STATUS_COLORS[t.status] || ''}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.startingScore || 501}</span>
                    <span>{t.setsToWin || 1} set(a)</span>
                  </div>
                </Link>

                {/* Action bar */}
                <div className="border-t border-slate-700 px-4 py-2 flex items-center justify-between">
                  <Link href={`/tournaments/${t.id}`} className="text-xs text-slate-400 hover:text-orange-400 flex items-center gap-1 transition-colors">
                    Otvori <ChevronRight className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); setConfirmDelete(t); }}
                    disabled={deletingId === t.id}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-40"
                    title="Obriši turnir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="card p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Obriši turnir</h3>
                <p className="text-sm text-slate-400">Ova radnja je nepovratna</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-5">
              Da li ste sigurni da želite da obrišete turnir{' '}
              <span className="font-semibold text-white">"{confirmDelete.name}"</span>?
              Svi mečevi i podaci će biti trajno izgubljeni.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {deletingId === confirmDelete.id ? 'Brisanje...' : 'Da, obriši'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors">
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
