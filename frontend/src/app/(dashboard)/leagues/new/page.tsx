'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import { Topbar } from '@/components/layout/topbar';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewLeaguePage() {
  const router = useRouter();
  const { club } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    format: 'single',
    setsPerMatch: 1,
    legsPerSet: 3,
    startingScore: 501,
    pointsWin: 2,
    pointsDraw: 1,
    pointsLoss: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club?.id) return;
    setLoading(true);
    try {
      const l = await leaguesApi.create(club.id, form);
      router.push(`/leagues/${l.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Nova Liga" />
      <div className="p-6 max-w-2xl">
        <Link href="/leagues" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Nazad
        </Link>
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Kreiraj Ligu</h2>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Naziv *</label>
              <input type="text" className="input-field" placeholder="Zimska Liga 2025" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'single', label: 'Jednostruki', desc: 'Svako igra sa svakim jednom' },
                  { value: 'home_away', label: 'Domaći/Gostujući', desc: 'Svako igra sa svakim dva puta' },
                ].map((f) => (
                  <label key={f.value} className={`flex flex-col p-3 rounded-lg border cursor-pointer ${
                    form.format === f.value ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 hover:border-slate-600'
                  }`}>
                    <input type="radio" name="format" value={f.value} checked={form.format === f.value}
                      onChange={(e) => setForm({ ...form, format: e.target.value })} className="sr-only" />
                    <span className="text-sm font-medium text-white">{f.label}</span>
                    <span className="text-xs text-slate-400">{f.desc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Polazni rez.</label>
                <select className="input-field" value={form.startingScore}
                  onChange={(e) => setForm({ ...form, startingScore: parseInt(e.target.value) })}>
                  <option value={501}>501</option>
                  <option value={301}>301</option>
                  <option value={701}>701</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Setova po meču</label>
                <input type="number" className="input-field" min={1} max={9} value={form.setsPerMatch}
                  onChange={(e) => setForm({ ...form, setsPerMatch: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Legova po setu</label>
                <input type="number" className="input-field" min={1} max={11} value={form.legsPerSet}
                  onChange={(e) => setForm({ ...form, legsPerSet: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Bodovi – Pobeda</label>
                <input type="number" className="input-field" min={0} value={form.pointsWin}
                  onChange={(e) => setForm({ ...form, pointsWin: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Bodovi – Remi</label>
                <input type="number" className="input-field" min={0} value={form.pointsDraw}
                  onChange={(e) => setForm({ ...form, pointsDraw: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Bodovi – Poraz</label>
                <input type="number" className="input-field" min={0} value={form.pointsLoss}
                  onChange={(e) => setForm({ ...form, pointsLoss: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Kreiranje...' : 'Kreiraj Ligu'}
              </button>
              <Link href="/leagues" className="btn-secondary">Otkaži</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
