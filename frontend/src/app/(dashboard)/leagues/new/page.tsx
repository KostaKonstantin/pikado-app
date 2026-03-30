'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import {
  ArrowLeft, ArrowRight, Plus, X, Search, Check,
  Users, Loader2, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

/* ─── pixel avatar ──────────────────────────────────────────────── */
function PixelAvatar({ name, size = 'sm' }: { name?: string; size?: 'sm' | 'md' }) {
  const src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name || '?')}`;
  const sz  = size === 'md' ? 'w-10 h-10 rounded-xl' : 'w-8 h-8 rounded-lg';
  return (
    <div className={`${sz} bg-slate-800 overflow-hidden shrink-0`}>
      <img src={src} alt={name || '?'} className="w-full h-full object-cover scale-110" />
    </div>
  );
}

/* ─── step indicator ─────────────────────────────────────────────── */
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300
            ${i + 1 === step ? 'w-5 h-1.5 bg-orange-500' :
              i + 1 < step  ? 'w-1.5 h-1.5 bg-orange-500/50' :
                              'w-1.5 h-1.5 bg-slate-700'}
          `}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function NewLeaguePage() {
  const router  = useRouter();
  const { club } = useAuthStore();
  const { isCollapsed } = useSidebarStore();

  /* ── wizard state ──────────────────────────────────────────── */
  const [step,       setStep]       = useState(1);       // 1 = settings, 2 = players
  const [createdId,  setCreatedId]  = useState('');      // league ID after step 1

  /* ── step 1: league settings ───────────────────────────────── */
  const [form, setForm] = useState({
    name:          '',
    mode:          'round',
    format:        'home_away',
    setsPerMatch:  1,
    legsPerSet:    4,
    startingScore: 501,
    pointsWin:     2,
    pointsDraw:    1,
    pointsLoss:    0,
  });
  const [step1Error,   setStep1Error]   = useState('');
  const [step1Loading, setStep1Loading] = useState(false);

  /* ── step 2: player selection ──────────────────────────────── */
  const [allPlayers,      setAllPlayers]      = useState<any[]>([]);
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [playersLoading,  setPlayersLoading]  = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [creating,        setCreating]        = useState<string | null>(null); // player name being created
  const [addingIds,       setAddingIds]       = useState<Set<string>>(new Set());
  const [step2Loading,    setStep2Loading]    = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* load all club players when entering step 2 */
  useEffect(() => {
    if (step !== 2 || !club?.id) return;
    setPlayersLoading(true);
    playersApi.getAll(club.id)
      .then(setAllPlayers)
      .finally(() => {
        setPlayersLoading(false);
        setTimeout(() => searchRef.current?.focus(), 100);
      });
  }, [step, club?.id]);

  /* ── STEP 1: create league ─────────────────────────────────── */
  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club?.id) return;
    setStep1Loading(true);
    setStep1Error('');
    try {
      const l = await leaguesApi.create(club.id, form);
      setCreatedId(l.id);
      setStep(2);
    } catch (err: any) {
      setStep1Error(err.response?.data?.message || 'Greška pri kreiranju lige');
    } finally {
      setStep1Loading(false);
    }
  };

  /* ── STEP 2: helpers ───────────────────────────────────────── */
  const trimmed = searchQuery.trim();

  /* filter: show unselected players that match query (or all if empty) */
  const filteredAvailable = allPlayers.filter((p) =>
    p.fullName.toLowerCase().includes(trimmed.toLowerCase())
  );

  /* show "create" option when query is non-empty and no exact match */
  const exactMatch = allPlayers.some(
    (p) => p.fullName.toLowerCase() === trimmed.toLowerCase()
  );
  const showCreate = trimmed.length >= 2 && !exactMatch;

  const selectedPlayers = allPlayers.filter((p) => selectedIds.has(p.id));

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* create new player and auto-select */
  const handleCreatePlayer = async () => {
    if (!club?.id || !trimmed || creating) return;
    setCreating(trimmed);
    try {
      const p = await playersApi.create(club.id, { fullName: trimmed });
      setAllPlayers((prev) => [p, ...prev]);
      setSelectedIds((prev) => new Set([...prev, p.id]));
      setSearchQuery('');
    } catch { /* silently fail */ }
    finally { setCreating(null); }
  };

  /* add all selected players to league, then navigate */
  const handleFinish = async () => {
    if (!club?.id || !createdId) return;
    setStep2Loading(true);
    try {
      await Promise.all(
        [...selectedIds].map((pid) => leaguesApi.addPlayer(club.id!, createdId, pid))
      );
    } catch { /* silently fail — players can be added later */ }
    finally {
      router.push(`/leagues/${createdId}`);
    }
  };

  const skipToLeague = () => router.push(`/leagues/${createdId}`);

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar title="Nova Liga" />

      <div className="p-4 md:p-6 max-w-lg mx-auto">

        {/* back + step dots */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          {step === 1 ? (
            <Link href="/leagues" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Nazad
            </Link>
          ) : (
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Podešavanja
            </button>
          )}
          <StepDots step={step} total={2} />
        </div>

        {/* ══ STEP 1: LEAGUE SETTINGS ══════════════════════════════ */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <p className="text-xs font-semibold text-orange-400/80 uppercase tracking-widest mb-1">Korak 1 od 2</p>
              <h1 className="text-2xl font-bold text-white">Podešavanja lige</h1>
              <p className="text-sm text-slate-400 mt-1">Definiši pravila i format takmičenja</p>
            </div>

            {step1Error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-5 text-sm animate-fade-in">
                {step1Error}
              </div>
            )}

            <form onSubmit={handleCreateLeague} className="space-y-5">

              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  Naziv <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="npr. Zimska Liga 2025"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full h-12 px-4 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500
                    focus:outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20 text-base transition-all"
                />
              </div>

              {/* Mode */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">Tip lige</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'round',   label: 'Kola',   desc: 'Ceo raspored unapred' },
                    { value: 'session', label: 'Večeri', desc: 'Fleksibilan raspored' },
                  ].map((m) => (
                    <label key={m.value} className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all
                      ${form.mode === m.value
                        ? 'border-orange-500 bg-orange-500/10 shadow-sm shadow-orange-500/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/40'}`}
                    >
                      <input type="radio" name="mode" value={m.value} checked={form.mode === m.value}
                        onChange={(e) => setForm({ ...form, mode: e.target.value })} className="sr-only" />
                      <span className="text-sm font-semibold text-white">{m.label}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{m.desc}</span>
                    </label>
                  ))}
                </div>

                {/* EvroLiga — full-width option */}
                <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all
                  ${form.mode === 'euroleague'
                    ? 'border-amber-500 bg-amber-500/8 shadow-sm shadow-amber-500/10'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/40'}`}
                >
                  <input type="radio" name="mode" value="euroleague" checked={form.mode === 'euroleague'}
                    onChange={(e) => setForm({ ...form, mode: e.target.value })} className="sr-only" />
                  <span className="text-lg leading-none mt-0.5">🏆</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-white">EvroLiga</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">Višefazno takmičenje s regularnim delom, barážom, Top 10 i playoffom</span>
                    {form.mode === 'euroleague' && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {['Regularni deo', 'Baraž (9–20)', 'Top 10', 'Playoff'].map((phase, i) => (
                          <span key={phase} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>
                            {i + 1}. {phase}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Format — hidden for euroleague (fixed single RR per phase) */}
              <div className={`space-y-1.5 transition-all ${form.mode === 'euroleague' ? 'hidden' : ''}`}>
                <label className="block text-sm font-medium text-slate-300">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'single',    label: 'Jednostruki', desc: 'Svako sa svakim jednom' },
                    { value: 'home_away', label: 'Dvostruki',   desc: 'Svako sa svakim dva puta' },
                  ].map((f) => (
                    <label key={f.value} className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all
                      ${form.format === f.value
                        ? 'border-orange-500 bg-orange-500/10 shadow-sm shadow-orange-500/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/40'}`}
                    >
                      <input type="radio" name="format" value={f.value} checked={form.format === f.value}
                        onChange={(e) => setForm({ ...form, format: e.target.value })} className="sr-only" />
                      <span className="text-sm font-semibold text-white">{f.label}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{f.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Numeric settings — hidden for euroleague */}
              <div className={`grid grid-cols-3 gap-3 ${form.mode === 'euroleague' ? 'hidden' : ''}`}>
                {[
                  { label: 'Polaz. rez.', key: 'startingScore', type: 'select', options: [501, 301, 701] },
                  { label: 'Setova',      key: 'setsPerMatch',  min: 1, max: 9 },
                  { label: 'Legova/set',  key: 'legsPerSet',    min: 1, max: 11 },
                ].map((f: any) => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-400">{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        className="w-full h-10 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm
                          focus:outline-none focus:border-orange-500/50 transition-all"
                        value={(form as any)[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: parseInt(e.target.value) })}
                      >
                        {f.options.map((o: number) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min={f.min} max={f.max}
                        className="w-full h-10 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm
                          focus:outline-none focus:border-orange-500/50 transition-all"
                        value={(form as any)[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: parseInt(e.target.value) || f.min })}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className={`grid grid-cols-3 gap-3 ${form.mode === 'euroleague' ? 'hidden' : ''}`}>
                {[
                  { label: 'Bod. – Pobeda', key: 'pointsWin' },
                  { label: 'Bod. – Remi',   key: 'pointsDraw' },
                  { label: 'Bod. – Poraz',  key: 'pointsLoss' },
                ].map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-400">{f.label}</label>
                    <input
                      type="number" min={0}
                      className="w-full h-10 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm
                        focus:outline-none focus:border-orange-500/50 transition-all"
                      value={(form as any)[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={step1Loading || !form.name.trim()}
                  className="w-full h-12 rounded-xl font-semibold text-base transition-all active:scale-[0.98]
                    bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100
                    flex items-center justify-center gap-2"
                >
                  {step1Loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Kreiranje...</>
                  ) : (
                    <>Nastavi <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══ STEP 2: PLAYER SELECTION ══════════════════════════════ */}
        {step === 2 && (
          <div className="animate-fade-in-up pb-28">

            {/* header */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-orange-400/80 uppercase tracking-widest mb-1">Korak 2 od 2</p>
              <h1 className="text-2xl font-bold text-white">Dodaj igrače</h1>
              <p className="text-sm text-slate-400 mt-1">
                {selectedIds.size > 0
                  ? <><span className="text-white font-semibold">{selectedIds.size}</span> igrač{selectedIds.size !== 1 ? 'a' : ''} izabrano</>
                  : 'Izaberi igrače koji učestvuju u ligi'}
              </p>
            </div>

            {/* ── search + create input ── */}
            <div className="relative mb-4">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700
                focus-within:border-orange-500/60 focus-within:ring-2 focus-within:ring-orange-500/15 transition-all"
              >
                <Search className="w-4 h-4 text-slate-500 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (showCreate) handleCreatePlayer();
                      else if (filteredAvailable.length === 1) togglePlayer(filteredAvailable[0].id);
                    }
                    if (e.key === 'Escape') setSearchQuery('');
                  }}
                  placeholder="Pretraži ili dodaj igrača…"
                  className="flex-1 bg-transparent text-sm outline-none text-white placeholder-slate-500 min-w-0"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
                  </button>
                )}
              </div>

              {/* dropdown */}
              {(trimmed && (filteredAvailable.length > 0 || showCreate)) && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 z-20 overflow-hidden animate-fade-in-down max-h-56 overflow-y-auto">
                  {filteredAvailable.map((p) => {
                    const isSel = selectedIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => { togglePlayer(p.id); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                          ${isSel ? 'bg-orange-500/10' : 'hover:bg-slate-700/60'}
                        `}
                      >
                        <PixelAvatar name={p.fullName} />
                        <span className="flex-1 text-sm text-white truncate">{p.fullName}</span>
                        {isSel
                          ? <Check className="w-4 h-4 text-orange-400 shrink-0" />
                          : <Plus className="w-4 h-4 text-slate-500 shrink-0" />
                        }
                      </button>
                    );
                  })}
                  {showCreate && (
                    <button
                      onClick={handleCreatePlayer}
                      disabled={!!creating}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-green-500/10 border-t border-slate-700/50 transition-colors disabled:opacity-50"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 text-green-400 shrink-0 animate-spin" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                          <Plus className="w-4 h-4 text-green-400" />
                        </div>
                      )}
                      <span className="text-sm text-white flex-1">
                        Kreiraj <span className="font-semibold text-green-400">"{trimmed}"</span>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── selected players ── */}
            {selectedPlayers.length > 0 && (
              <div className="mb-5 animate-fade-in">
                <p className="text-xs font-semibold text-orange-400/80 uppercase tracking-widest mb-2">
                  Izabrani ({selectedPlayers.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 rounded-xl pl-1.5 pr-2 py-1 animate-scale-in"
                    >
                      <PixelAvatar name={p.fullName} size="sm" />
                      <span className="text-sm font-medium text-white">{p.fullName}</span>
                      <button
                        onClick={() => togglePlayer(p.id)}
                        className="w-4 h-4 rounded-full bg-slate-700 hover:bg-red-500/30 hover:text-red-400 text-slate-400 flex items-center justify-center transition-colors ml-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── available players ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {trimmed ? 'Rezultati' : 'Svi igrači'}
                  {!playersLoading && ` (${filteredAvailable.length})`}
                </p>
                {!trimmed && allPlayers.length > 0 && (
                  <button
                    onClick={() => {
                      const allIds = new Set(allPlayers.map((p) => p.id));
                      const allSelected = allPlayers.every((p) => selectedIds.has(p.id));
                      setSelectedIds(allSelected ? new Set() : allIds);
                    }}
                    className="text-xs text-slate-400 hover:text-orange-400 transition-colors"
                  >
                    {allPlayers.every((p) => selectedIds.has(p.id)) ? 'Poništi sve' : 'Izaberi sve'}
                  </button>
                )}
              </div>

              {playersLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="card px-3 py-3 flex items-center gap-3 animate-pulse">
                      <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
                      <div className="skeleton h-3.5 w-32 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredAvailable.length === 0 && !showCreate ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  {allPlayers.length === 0 ? (
                    <>
                      <p className="text-sm font-medium text-white mb-1">Nema igrača</p>
                      <p className="text-xs text-slate-500 mb-4">Upišite ime da kreirate prvog igrača</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-400">Nema rezultata za "{trimmed}"</p>
                      <p className="text-xs text-slate-600 mt-1">Upišite puno ime da kreirate novog</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAvailable.map((p, i) => {
                    const isSel = selectedIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlayer(p.id)}
                        style={{ animationDelay: `${i * 20}ms` }}
                        className={`w-full card px-3 py-2.5 flex items-center gap-3 text-left transition-all duration-150 group animate-fade-in
                          ${isSel
                            ? 'ring-1 ring-orange-500 bg-orange-500/[0.06]'
                            : 'hover:bg-slate-800/60 hover:-translate-y-px'}
                        `}
                      >
                        <PixelAvatar name={p.fullName} size="sm" />
                        <span className="flex-1 text-sm font-medium text-white truncate">{p.fullName}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                          ${isSel
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-slate-600 group-hover:border-slate-400'}
                        `}>
                          {isSel && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ STICKY BOTTOM CTA (step 2) ════════════════════════════ */}
      {step === 2 && (
        <div
          className={`fixed bottom-0 right-0 z-30 animate-fade-in left-0 transition-all duration-300
            ${isCollapsed ? 'lg:left-16' : 'lg:left-64'}`}
          style={{
            background: 'linear-gradient(to top, var(--bg-primary) 70%, transparent)',
            paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          }}
        >
          <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-2">
            <button
              onClick={handleFinish}
              disabled={step2Loading || selectedIds.size === 0}
              className="w-full h-12 rounded-xl font-semibold text-base transition-all active:scale-[0.98]
                bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/25
                disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100
                flex items-center justify-center gap-2"
            >
              {step2Loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Dodavanje...</>
              ) : selectedIds.size > 0 ? (
                <>
                  <Users className="w-4 h-4" />
                  Nastavi sa {selectedIds.size} igrač{selectedIds.size !== 1 ? 'a' : 'em'}
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>Izaberi igrače</>
              )}
            </button>
            <button
              onClick={skipToLeague}
              className="w-full text-sm text-slate-400 hover:text-white transition-colors py-1.5 flex items-center justify-center gap-1.5 group"
            >
              <span className="group-hover:underline underline-offset-2">Preskoči</span>
              <span className="text-slate-600 group-hover:text-slate-400 transition-colors">— dodaj igrače kasnije</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
