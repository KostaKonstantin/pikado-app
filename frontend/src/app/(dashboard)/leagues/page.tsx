'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import { Topbar } from '@/components/layout/topbar';
import { Swords, Plus, ChevronRight, Trash2, Settings, X, AlertTriangle } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = { draft: 'Nacrt', active: 'Aktivna', completed: 'Završena' };
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  active: 'bg-green-500/20 text-green-400',
  completed: 'bg-slate-700 text-slate-400',
};

export default function LeaguesPage() {
  const { club } = useAuthStore();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [editLeague, setEditLeague] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!club?.id) return;
    leaguesApi.getAll(club.id).then(setLeagues).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [club?.id]);

  const handleDelete = async () => {
    if (!confirmDelete || !club?.id) return;
    setDeletingId(confirmDelete.id);
    try {
      await leaguesApi.remove(club.id, confirmDelete.id);
      setLeagues((prev) => prev.filter((x) => x.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (e: React.MouseEvent, l: any) => {
    e.preventDefault();
    setEditLeague(l);
    setEditForm({
      name: l.name,
      pointsWin: l.pointsWin,
      pointsDraw: l.pointsDraw,
      pointsLoss: l.pointsLoss,
      setsPerMatch: l.setsPerMatch,
      legsPerSet: l.legsPerSet,
      startingScore: l.startingScore,
    });
  };

  const saveEdit = async () => {
    if (!editLeague || !club?.id) return;
    setSaving(true);
    try {
      const updated = await leaguesApi.update(club.id, editLeague.id, editForm);
      setLeagues((prev) => prev.map((l) => (l.id === editLeague.id ? { ...l, ...updated } : l)));
      setEditLeague(null);
    } finally {
      setSaving(false);
    }
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm((prev: any) => ({ ...prev, [key]: key === 'name' ? e.target.value : parseInt(e.target.value) || 0 }));

  return (
    <div>
      <Topbar
        title="Lige"
        actions={
          <Link href="/leagues/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Kreiraj Ligu
          </Link>
        }
      />
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card p-6 h-36 animate-pulse bg-slate-800" />)}
          </div>
        ) : leagues.length === 0 ? (
          <div className="text-center py-24">
            <Swords className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nema Liga</h3>
            <p className="text-slate-400 mb-6">Kreirajte prvu ligu za vaš klub</p>
            <Link href="/leagues/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Kreiraj Ligu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((l) => (
              <div key={l.id} className="card hover:border-slate-600 transition-all group flex flex-col">
                {/* Clickable body */}
                <Link href={`/leagues/${l.id}`} className="block p-5 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <Swords className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">{l.name}</h3>
                      <p className="text-slate-500 text-xs">{l.format === 'home_away' ? 'Domaći/Gostujući' : 'Jednostruki'}</p>
                    </div>
                    <span className={`badge text-xs shrink-0 ${STATUS_COLORS[l.status] || ''}`}>
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{l.setsPerMatch} set(a) · {l.legsPerSet} lega · {l.startingScore || 501}</p>
                </Link>

                {/* Action bar */}
                <div className="border-t border-slate-700 px-4 py-2 flex items-center justify-between">
                  <Link href={`/leagues/${l.id}`} className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors">
                    Otvori <ChevronRight className="w-3 h-3" />
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEdit(e, l)}
                      className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                      title="Podešavanja">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); setConfirmDelete(l); }}
                      disabled={deletingId === l.id}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-40"
                      title="Obriši ligu">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                <h3 className="font-semibold text-white">Obriši ligu</h3>
                <p className="text-sm text-slate-400">Ova radnja je nepovratna</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-5">
              Da li ste sigurni da želite da obrišete ligu{' '}
              <span className="font-semibold text-white">"{confirmDelete.name}"</span>?
              Sve utakmice i podaci će biti trajno izgubljeni.
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

      {/* Edit Modal */}
      {editLeague && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditLeague(null)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Podešavanja lige</h3>
              <button onClick={() => setEditLeague(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Naziv lige</label>
                <input className="input-field" value={editForm.name} onChange={f('name')} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Bod. pobeda</label>
                  <input type="number" className="input-field" min={0} value={editForm.pointsWin} onChange={f('pointsWin')} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Bod. remi</label>
                  <input type="number" className="input-field" min={0} value={editForm.pointsDraw} onChange={f('pointsDraw')} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Bod. poraz</label>
                  <input type="number" className="input-field" min={0} value={editForm.pointsLoss} onChange={f('pointsLoss')} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Setova/meč</label>
                  <input type="number" className="input-field" min={1} value={editForm.setsPerMatch} onChange={f('setsPerMatch')} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Legova/set</label>
                  <input type="number" className="input-field" min={1} value={editForm.legsPerSet} onChange={f('legsPerSet')} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Početni skor</label>
                  <input type="number" className="input-field" min={101} value={editForm.startingScore} onChange={f('startingScore')} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 justify-center text-sm">
                {saving ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
              <button onClick={() => setEditLeague(null)} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
