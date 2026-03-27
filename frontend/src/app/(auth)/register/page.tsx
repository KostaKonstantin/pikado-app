'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Mail, Lock, User, Building2, MapPin, Globe, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

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
    <div className="auth-card p-7 animate-scale-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Kreirajte nalog</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Registrujte vaš klub i počnite odmah</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-5 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{Array.isArray(error) ? (error as string[]).join(', ') : error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal info */}
        <div>
          <label className="form-label">Ime i Prezime</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
            <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }}
              placeholder="Marko Marković" value={form.fullName} onChange={set('fullName')} autoComplete="name" />
          </div>
        </div>
        <div>
          <label className="form-label">Email adresa *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
            <input type="email" className="input-field" style={{ paddingLeft: '2.5rem' }}
              placeholder="vas@email.com" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>
        </div>
        <div>
          <label className="form-label">Lozinka *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
            <input type="password" className="input-field" style={{ paddingLeft: '2.5rem' }}
              placeholder="Minimum 6 karaktera" value={form.password} onChange={set('password')}
              required minLength={6} autoComplete="new-password" />
          </div>
        </div>

        {/* Divider */}
        <div className="divider-text py-1">
          <span>Informacije o Klubu</span>
        </div>

        <div>
          <label className="form-label">Naziv Kluba *</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
            <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }}
              placeholder="Pikado Klub Beograd" value={form.clubName} onChange={set('clubName')} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Grad</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
              <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }}
                placeholder="Beograd" value={form.clubCity} onChange={set('clubCity')} />
            </div>
          </div>
          <div>
            <label className="form-label">Zemlja</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
              <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }}
                placeholder="Srbija" value={form.clubCountry} onChange={set('clubCountry')} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full justify-center mt-2"
          style={{ height: '2.75rem' }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Kreiraj Nalog i Klub
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Već imate nalog?{' '}
        <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
          Prijavite se
        </Link>
      </p>
    </div>
  );
}
