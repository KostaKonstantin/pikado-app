'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { ArrowLeft, RefreshCw, Plus, CheckCircle2, Users } from 'lucide-react';
import Link from 'next/link';

/* ─── avatar helpers (mirrors leagues page) ────────────────────── */

function avatarRarity(name: string): 'common' | 'rare' | 'epic' | 'legendary' {
  const h = Array.from(name || '').reduce((acc, c) => ((acc * 31) + c.charCodeAt(0)) & 0xffff, 7) % 100;
  if (h >= 97) return 'legendary';
  if (h >= 85) return 'epic';
  if (h >= 60) return 'rare';
  return 'common';
}

const RARITY_LABEL: Record<string, string> = {
  legendary: 'Legendary',
  epic:      'Epic',
  rare:      'Rare',
  common:    '',
};
const RARITY_COLOR: Record<string, string> = {
  legendary: 'text-yellow-400',
  epic:      'text-violet-400',
  rare:      'text-blue-400',
  common:    '',
};
const RARITY_RING: Record<string, string> = {
  legendary: 'ring-4 ring-yellow-400/70 shadow-2xl shadow-yellow-400/30',
  epic:      'ring-4 ring-violet-500/60 shadow-2xl shadow-violet-500/20',
  rare:      'ring-2 ring-blue-400/50 shadow-lg shadow-blue-400/10',
  common:    'ring-1 ring-slate-600/50',
};

/* random reroll seeds so "reroll" always gives a different avatar */
const REROLL_SEEDS = ['dart', 'bull', 'ace', 'pro', 'champ', 'king', 'legend', 'striker', 'hawk', 'blade'];

export default function NewPlayerPage() {
  const router  = useRouter();
  const { club } = useAuthStore();

  const [form,    setForm]    = useState({ fullName: '', nickname: '', country: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState<{ id: string; name: string } | null>(null);

  /* avatar preview */
  const [avatarSeed,    setAvatarSeed]    = useState('');
  const [rerollOffset,  setRerollOffset]  = useState(0);
  const [avatarFading,  setAvatarFading]  = useState(false);
  const prevSeedRef = useRef('');

  /* avatar only changes on reroll button — not while typing */
  const handleReroll = () => {
    const next = rerollOffset + 1;
    setRerollOffset(next);
    const newSeed = REROLL_SEEDS[next % REROLL_SEEDS.length];
    setAvatarFading(true);
    setTimeout(() => {
      setAvatarSeed(newSeed);
      setAvatarFading(false);
    }, 120);
  };

  /* init on mount */
  useEffect(() => {
    setAvatarSeed(REROLL_SEEDS[0]);
    prevSeedRef.current = REROLL_SEEDS[0];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rarity = avatarRarity(avatarSeed || REROLL_SEEDS[0]);
  const avatarSrc = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(avatarSeed || REROLL_SEEDS[0])}`;

  /* ── submit ─────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club?.id || !form.fullName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const p = await playersApi.create(club.id, form);
      setDone({ id: p.id, name: form.fullName.trim() });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška pri dodavanju igrača');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setForm({ fullName: '', nickname: '', country: '' });
    setDone(null);
    setRerollOffset(0);
    setAvatarSeed('preview');
  };

  /* ── success screen ─────────────────────────────────────────── */
  if (done) {
    return (
      <div>
        <Topbar title="Novi Igrač" />
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
          <div className="w-full max-w-sm animate-scale-in flex flex-col items-center text-center gap-6">
            <div className={`w-24 h-24 rounded-2xl bg-slate-800 overflow-hidden ${RARITY_RING[rarity]}`}>
              <img src={avatarSrc} alt={done.name} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="text-lg font-semibold text-white">Igrač dodat!</p>
              </div>
              <p className="text-slate-400 text-sm">
                <span className="text-white font-medium">{done.name}</span> je uspešno kreiran
              </p>
              {RARITY_LABEL[rarity] && (
                <p className={`text-xs font-bold tracking-widest uppercase mt-1 ${RARITY_COLOR[rarity]}`}>
                  {RARITY_LABEL[rarity]} avatar
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={handleAddAnother}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 font-medium text-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Dodaj još
              </button>
              <Link
                href={`/players/${done.id}`}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-orange-500/25"
              >
                <Users className="w-4 h-4" /> Idi na igrača
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── main form ──────────────────────────────────────────────── */
  return (
    <div>
      <Topbar title="Novi Igrač" />
      <div className="min-h-[calc(100vh-56px)] flex items-start justify-center px-4 pt-8 pb-24 sm:pt-16 sm:pb-8 sm:items-center">
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Back */}
          <Link href="/players" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Nazad
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">Dodaj igrača</h1>
            <p className="text-slate-400 text-sm mt-1">Kreiraj identitet novog igrača</p>
          </div>

          {/* Avatar preview */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <div
              className={`relative w-24 h-24 rounded-2xl bg-slate-800 overflow-hidden transition-all duration-300
                ${RARITY_RING[rarity]}
                ${avatarFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
              `}
            >
              <img
                src={avatarSrc}
                alt="Avatar preview"
                className="w-full h-full object-cover scale-110"
              />
              {rarity === 'legendary' && (
                <div className="absolute inset-0 animate-shimmer pointer-events-none" />
              )}
            </div>

            <div className="flex flex-col items-center gap-1.5">
              {RARITY_LABEL[rarity] && (
                <span className={`text-xs font-bold tracking-widest uppercase ${RARITY_COLOR[rarity]}`}>
                  {RARITY_LABEL[rarity]}
                </span>
              )}
              <button
                type="button"
                onClick={handleReroll}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-400 transition-colors active:scale-95 px-3 py-1 rounded-lg hover:bg-orange-500/10"
              >
                <RefreshCw className="w-3 h-3" />
                Novi avatar
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-5 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Ime i Prezime <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                autoFocus
                placeholder="npr. Marko Marković"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className="w-full h-12 px-4 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500
                  focus:outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20
                  text-base transition-all"
              />
            </div>

            {/* Nickname */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-400">
                Nadimak <span className="text-slate-600 font-normal text-xs ml-1">opciono</span>
              </label>
              <input
                type="text"
                placeholder="npr. The Machine"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-slate-800/80 border border-slate-700/70 text-white placeholder-slate-600
                  focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/15
                  text-sm transition-all"
              />
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-400">
                Zemlja <span className="text-slate-600 font-normal text-xs ml-1">opciono</span>
              </label>
              <input
                type="text"
                placeholder="npr. Srbija"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-slate-800/80 border border-slate-700/70 text-white placeholder-slate-600
                  focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/15
                  text-sm transition-all"
              />
            </div>

            {/* CTA */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || !form.fullName.trim()}
                className="w-full h-12 rounded-xl font-semibold text-base transition-all active:scale-[0.98]
                  bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/25
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
                  flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Dodavanje...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Dodaj igrača
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
