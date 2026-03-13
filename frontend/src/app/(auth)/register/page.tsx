'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    clubName: '',
    clubCity: '',
    clubCountry: 'Srbija',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(form);
      setAuth(res.user, res.club, res.accessToken, res.role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška pri registraciji');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Registracija</h2>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
          {Array.isArray(error) ? error.join(', ') : error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Ime i Prezime</label>
          <input type="text" className="input-field" placeholder="Marko Marković" value={form.fullName} onChange={set('fullName')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
          <input type="email" className="input-field" placeholder="vas@email.com" value={form.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Lozinka *</label>
          <input type="password" className="input-field" placeholder="Minimum 6 karaktera" value={form.password} onChange={set('password')} required minLength={6} />
        </div>
        <hr className="border-slate-700 my-2" />
        <p className="text-sm text-slate-400 font-medium">Informacije o Klubu</p>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Naziv Kluba *</label>
          <input type="text" className="input-field" placeholder="Pikado Klub Beograd" value={form.clubName} onChange={set('clubName')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Grad</label>
            <input type="text" className="input-field" placeholder="Beograd" value={form.clubCity} onChange={set('clubCity')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Zemlja</label>
            <input type="text" className="input-field" placeholder="Srbija" value={form.clubCountry} onChange={set('clubCountry')} />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? 'Registracija...' : 'Kreiraj Nalog i Klub'}
        </button>
      </form>
      <p className="text-center text-slate-400 text-sm mt-6">
        Već imate nalog?{' '}
        <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium">
          Prijavite se
        </Link>
      </p>
    </div>
  );
}
