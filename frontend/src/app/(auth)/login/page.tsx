'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);
      setAuth(res.user, res.club, res.accessToken, res.role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška pri prijavi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card p-7 animate-scale-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dobrodošli nazad</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Prijavite se na vaš nalog</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-5 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Email adresa</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="email"
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="vas@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Lozinka</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="password"
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
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
              Prijavi se
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </form>

      {/* <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Nemate nalog?{' '}
        <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
          Registrujte se
        </Link>
      </p> */}
    </div>
  );
}
