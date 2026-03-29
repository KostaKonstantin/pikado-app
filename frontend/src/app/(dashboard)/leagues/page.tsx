'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import { Topbar } from '@/components/layout/topbar';
import { Swords, Plus, ChevronRight, Trash2, Settings, X, AlertTriangle, Loader2 } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = { draft: 'Nacrt', active: 'Aktivna', completed: 'Završena' };
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-400',
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-slate-500/10 text-slate-500',
};

function SkeletonLeagueCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
        </div>
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar
        title="Lige"
        actions={
          <Link href="/leagues/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Kreiraj Ligu
          </Link>
        }
      />

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonLeagueCard key={i} />)}
          </div>
        ) : leagues.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="w-20 h-20 rounded-3xl gradient-accent/10 flex items-center justify-center mb-5 border border-orange-500/20">
              <Swords className="w-9 h-9 text-orange-400/60" />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Nema Liga</h3>
            <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              Kreirajte prvu ligu za vaš klub i počnite sa organizacijom mečeva
            </p>
            <Link href="/leagues/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Kreiraj Ligu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((l, i) => (
              <div
                key={l.id}
                className="card-hover group flex flex-col animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Link href={`/leagues/${l.id}`} className="block p-5 flex-1">
                  {/* Header row */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110">
                      <Swords className="w-4.5 h-4.5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-snug truncate transition-colors group-hover:text-orange-400"
                        style={{ color: 'var(--text-primary)' }}>
                        {l.name}
                      </h3>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {l.format === 'home_away' ? 'Domaći / Gostujući' : 'Jednostruki krug'}
                      </p>
                    </div>
                    <span className={`badge text-[11px] shrink-0 ${STATUS_STYLES[l.status] || ''}`}>
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                  </div>

                  {/* Match format details */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { label: `${l.setsPerMatch} set${l.setsPerMatch !== 1 ? 'a' : ''}` },
                      { label: `${l.legsPerSet} leg${l.legsPerSet !== 1 ? 'ova' : ''}` },
                      { label: `${l.startingScore || 501}` },
                    ].map(({ label }) => (
                      <span
                        key={label}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </Link>

                {/* Action bar */}
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <Link
                    href={`/leagues/${l.id}`}
                    className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-orange-400"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Otvori <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => openEdit(e, l)}
                      className="p-1.5 rounded-lg transition-all hover:bg-blue-500/10 hover:text-blue-400"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Podešavanja"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); setConfirmDelete(l); }}
                      disabled={deletingId === l.id}
                      className="p-1.5 rounded-lg transition-all hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Obriši ligu"
                    >
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
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={() => setConfirmDelete(null)}
        >
          <div className="card p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Obriši ligu</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Ova radnja je nepovratna</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Da li ste sigurni da želite da obrišete ligu{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>"{confirmDelete.name}"</span>?
              Sve utakmice i podaci će biti trajno izgubljeni.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {deletingId === confirmDelete.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {deletingId === confirmDelete.id ? 'Brisanje...' : 'Da, obriši'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 px-4 text-sm font-medium rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editLeague && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setEditLeague(null)}
        >
          <div className="card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Podešavanja lige</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{editLeague.name}</p>
              </div>
              <button
                onClick={() => setEditLeague(null)}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Naziv lige</label>
                <input className="input-field" value={editForm.name} onChange={f('name')} />
              </div>
              <div>
                <label className="form-label mb-2">Bodovanje</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'pointsWin', label: 'Pobeda' },
                    { key: 'pointsDraw', label: 'Remi' },
                    { key: 'pointsLoss', label: 'Poraz' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="form-label">{label}</label>
                      <input type="number" className="input-field" min={0} value={editForm[key]} onChange={f(key)} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label mb-2">Format meča</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'setsPerMatch', label: 'Setova' },
                    { key: 'legsPerSet', label: 'Legova' },
                    { key: 'startingScore', label: 'Skor' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="form-label">{label}</label>
                      <input type="number" className="input-field" min={1} value={editForm[key]} onChange={f(key)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 justify-center text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sačuvaj'}
              </button>
              <button onClick={() => setEditLeague(null)} className="btn-secondary flex-1 justify-center text-sm">Otkaži</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
