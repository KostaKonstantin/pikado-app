'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { tournamentsApi } from '@/lib/api/tournaments.api';
import { Topbar } from '@/components/layout/topbar';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const FORMATS = [
  { value: 'single_elimination', label: 'Ispadanje (Single Elimination)', desc: 'Jedan poraz = eliminacija' },
  { value: 'double_elimination', label: 'Dvostruko Ispadanje', desc: 'Dva poraza = eliminacija' },
  { value: 'round_robin', label: 'Kružni Sistem (Round Robin)', desc: 'Svi igraju jedni s drugima' },
  { value: 'group_knockout', label: 'Grupe + Ispadanje', desc: 'Grupna faza pa direktno ispadanje' },
];

export default function NewTournamentPage() {
  const router = useRouter();
  const { club } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    format: 'single_elimination',
    setsToWin: 1,
    legsPerSet: 3,
    startingScore: 501,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club?.id) return;
    setError('');
    setLoading(true);
    try {
      const t = await tournamentsApi.create(club.id, form);
      router.push(`/tournaments/${t.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška pri kreiranju');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Novi Turnir" />
      <div className="p-6 max-w-2xl">
        <Link href="/tournaments" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Nazad
        </Link>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Kreiraj Turnir</h2>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Naziv Turnira *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Zimski Kup 2025"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Format Turnira *</label>
              <div className="space-y-2">
                {FORMATS.map((f) => (
                  <label key={f.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.format === f.value ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 hover:border-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="format"
                      value={f.value}
                      checked={form.format === f.value}
                      onChange={(e) => setForm({ ...form, format: e.target.value })}
                      className="mt-0.5 accent-orange-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{f.label}</p>
                      <p className="text-xs text-slate-400">{f.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Polazni rezultat</label>
                <select
                  className="input-field"
                  value={form.startingScore}
                  onChange={(e) => setForm({ ...form, startingScore: parseInt(e.target.value) })}
                >
                  <option value={501}>501</option>
                  <option value={301}>301</option>
                  <option value={701}>701</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Setova za pobedu</label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={10}
                  value={form.setsToWin}
                  onChange={(e) => setForm({ ...form, setsToWin: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Legova po setu</label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={11}
                  value={form.legsPerSet}
                  onChange={(e) => setForm({ ...form, legsPerSet: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Kreiranje...' : 'Kreiraj Turnir'}
              </button>
              <Link href="/tournaments" className="btn-secondary">Otkaži</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
