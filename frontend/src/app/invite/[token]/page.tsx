'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { invitesApi } from '@/lib/api/invites.api';
import { useAuthStore } from '@/store/auth.store';
import { Target, Loader2, Lock, Eye, EyeOff, AlertTriangle, Check, ArrowRight } from 'lucide-react';

type PageState = 'loading' | 'ready' | 'error' | 'success';

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user: authUser, setAuth } = useAuthStore();

  const [state, setState] = useState<PageState>('loading');
  const [invite, setInvite] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if logged-in user's email matches the invite
  const emailMatches = authUser && invite && authUser.email === invite.email;
  const needsPassword = !authUser || !emailMatches;

  useEffect(() => {
    if (!token) return;
    invitesApi.getByToken(token)
      .then((inv) => { setInvite(inv); setState('ready'); })
      .catch((e) => {
        setErrorMsg(e?.response?.data?.message || 'Pozivnica nije pronađena ili je istekla');
        setState('error');
      });
  }, [token]);

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const result = await invitesApi.accept(token, needsPassword ? password : undefined);
      setAuth(result.user, result.club, result.accessToken, result.role);
      setState('success');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Greška pri prihvatanju pozivnice');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 auth-bg"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-14 h-14 mb-4">
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 gradient-accent scale-110" />
            <div className="relative w-14 h-14 gradient-accent rounded-2xl flex items-center justify-center shadow-xl">
              <Target className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pikado</h1>
        </div>

        {/* Card */}
        <div className="auth-card rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>

          {/* Loading */}
          {state === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Učitavanje pozivnice...</p>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h2 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Pozivnica nije validna</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{errorMsg}</p>
              </div>
              <button onClick={() => router.push('/login')} className="btn-secondary text-sm">
                Idi na prijavu
              </button>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Dobrodošli u klub!</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Uspešno ste se pridružili klubu <strong className="text-orange-400">{invite?.club?.name}</strong>.
                  Preusmeravanje...
                </p>
              </div>
              <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
            </div>
          )}

          {/* Ready */}
          {state === 'ready' && (
            <div className="space-y-5">
              {/* Invite info */}
              <div className="text-center pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="font-bold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>
                  Pozivnica za klub
                </h2>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Pozvani ste da se pridružite
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <span className="font-bold text-orange-400 text-base">{invite?.club?.name}</span>
                  {invite?.club?.city && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>· {invite.club.city}</span>
                  )}
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                  za email: <strong style={{ color: 'var(--text-primary)' }}>{invite?.email}</strong>
                </p>
              </div>

              {/* Authenticated user with matching email */}
              {authUser && emailMatches && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                    {(authUser.fullName?.[0] || authUser.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{authUser.fullName || authUser.email}</p>
                    <p className="text-xs text-emerald-400">Prijavljen kao ovaj korisnik</p>
                  </div>
                </div>
              )}

              {/* Password input for anonymous / mismatched user */}
              {needsPassword && (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {authUser
                      ? 'Vaš nalog ne odgovara ovoj pozivnici. Unesite lozinku za nalog koji je pozvan.'
                      : 'Unesite lozinku za vaš nalog ili kreirajte novu.'}
                  </p>
                  <div>
                    <label className="form-label">Lozinka</label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      <input
                        type={showPwd ? 'text' : 'password'}
                        className="input-field pl-9 pr-10"
                        placeholder="Minimum 6 karaktera"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAccept()}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <p className="text-xs text-red-400 flex items-center gap-1.5 animate-fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
                </p>
              )}

              {/* Accept button */}
              <button
                onClick={handleAccept}
                disabled={submitting || (needsPassword && !password)}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Check className="w-4 h-4" /> Prihvati pozivnicu <ArrowRight className="w-4 h-4 ml-1" /></>
                }
              </button>

              <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                Pridružujete se kao <strong>Pregledač</strong> · Ulogа se može promeniti od strane administratora
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
