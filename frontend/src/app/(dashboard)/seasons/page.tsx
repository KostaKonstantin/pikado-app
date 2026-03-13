'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { seasonsApi } from '@/lib/api/seasons.api';
import { Topbar } from '@/components/layout/topbar';
import { Calendar, Plus, Check } from 'lucide-react';

export default function SeasonsPage() {
  const { club, role } = useAuthStore();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });

  const canEdit = role === 'club_admin';

  const load = () => {
    if (!club?.id) return;
    seasonsApi.getAll(club.id).then(setSeasons).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [club?.id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club?.id) return;
    await seasonsApi.create(club.id, form);
    setShowNew(false);
    setForm({ name: '', startDate: '', endDate: '' });
    load();
  };

  const activate = async (id: string) => {
    if (!club?.id) return;
    await seasonsApi.activate(club.id, id);
    load();
  };

  return (
    <div>
      <Topbar title="Sezone" actions={
        canEdit && <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Nova Sezona
        </button>
      } />
      <div className="p-6 space-y-4">
        {showNew && (
          <div className="card p-6 max-w-md">
            <h3 className="font-semibold text-white mb-4">Nova Sezona</h3>
            <form onSubmit={create} className="space-y-3">
              <input type="text" className="input-field" placeholder="Sezona 2025/26"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Početak</label>
                  <input type="date" className="input-field"
                    value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Kraj</label>
                  <input type="date" className="input-field"
                    value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm">Kreiraj</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-sm">Otkaži</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-slate-800" />)}</div>
        ) : seasons.length === 0 ? (
          <div className="text-center py-24">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nema Sezona</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {seasons.map((s) => (
              <div key={s.id} className={`card p-4 flex items-center justify-between ${s.isActive ? 'border-orange-500/30' : ''}`}>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-white">{s.name}</p>
                    {s.startDate && <p className="text-xs text-slate-400">{s.startDate} — {s.endDate || 'trenutno'}</p>}
                  </div>
                  {s.isActive && (
                    <span className="badge badge-active text-xs">Aktivna</span>
                  )}
                </div>
                {canEdit && !s.isActive && (
                  <button onClick={() => activate(s.id)} className="btn-secondary text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> Aktiviraj
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
