'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewPlayerPage() {
  const router = useRouter();
  const { club } = useAuthStore();
  const [form, setForm] = useState({ fullName: '', nickname: '', country: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club?.id) return;
    setLoading(true);
    try {
      const p = await playersApi.create(club.id, form);
      router.push(`/players/${p.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Novi Igrač" />
      <div className="p-6 max-w-md">
        <Link href="/players" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Nazad
        </Link>
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Dodaj Igrača</h2>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Ime i Prezime *</label>
              <input type="text" className="input-field" placeholder="Marko Marković"
                value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nadimak</label>
              <input type="text" className="input-field" placeholder="The Machine"
                value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Zemlja</label>
              <input type="text" className="input-field" placeholder="Srbija"
                value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Dodavanje...' : 'Dodaj Igrača'}
              </button>
              <Link href="/players" className="btn-secondary">Otkaži</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
