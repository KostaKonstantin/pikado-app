'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api/users.api';
import { clubsApi } from '@/lib/api/clubs.api';
import { Topbar } from '@/components/layout/topbar';
import { useTheme } from '@/lib/theme-context';
import {
  Pencil, Check, X, Loader2, Camera, Shield, Building2,
  CreditCard, Settings, Moon, Sun, LogOut, Lock, AlertTriangle,
  ChevronDown, ChevronUp, User, Eye, EyeOff,
} from 'lucide-react';

// ── Editable Field ────────────────────────────────────────────────────────────
interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (val: string) => Promise<void>;
  placeholder?: string;
  hint?: React.ReactNode;
}
function EditableField({ label, value, onSave, placeholder, hint }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { setCurrent(value); }, [value]);

  const handleSave = async () => {
    if (current.trim() === value) { setEditing(false); return; }
    setStatus('saving'); setErrorMsg('');
    try {
      await onSave(current.trim());
      setStatus('success');
      setEditing(false);
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.response?.data?.message || 'Greška pri čuvanju');
    }
  };

  const handleCancel = () => { setCurrent(value); setEditing(false); setStatus('idle'); setErrorMsg(''); };

  return (
    <div className="py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <label className="form-label">{label}</label>
      {editing ? (
        <div className="mt-1.5 space-y-1.5">
          <input
            className="input-field"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
          />
          {status === 'error' && (
            <p className="text-xs text-red-400 animate-fade-in">{errorMsg}</p>
          )}
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={status === 'saving'} className="btn-primary text-xs py-1.5 px-3">
              {status === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Sačuvaj</>}
            </button>
            <button onClick={handleCancel} className="btn-secondary text-xs py-1.5 px-3">
              <X className="w-3.5 h-3.5" /> Otkaži
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 mt-1">
          <div className="min-w-0">
            <span className="text-sm font-medium" style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {value || <span className="opacity-40">{placeholder || '—'}</span>}
            </span>
            {status === 'success' && (
              <span className="ml-2 text-xs text-emerald-400 animate-fade-in inline-flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Sačuvano
              </span>
            )}
            {hint && <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{hint}</div>}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg transition-all shrink-0 hover:bg-orange-500/10 hover:text-orange-400"
            style={{ color: 'var(--text-secondary)' }}
            title="Uredi"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Logo Upload ───────────────────────────────────────────────────────────────
function LogoUpload() {
  const { club, updateClub } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3099';
  const logoSrc = club?.logoUrl ? `${API_URL}${club.logoUrl}` : null;
  const initials = club?.name?.slice(0, 2).toUpperCase() || 'PK';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !club?.id) return;
    setUploading(true); setError('');
    try {
      const updated = await clubsApi.uploadLogo(club.id, file);
      updateClub({ logoUrl: updated.logoUrl });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Greška pri upload-u');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Logo preview with hover overlay */}
      <div className="relative group shrink-0">
        <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center border-2"
          style={{ borderColor: 'var(--border)' }}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Logo kluba"
              className="w-full h-full object-contain"
              onError={() => updateClub({ logoUrl: undefined })}
            />
          ) : (
            <div className="w-full h-full gradient-accent flex items-center justify-center text-white text-lg font-bold">
              {initials}
            </div>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          {uploading
            ? <Loader2 className="w-5 h-5 text-white animate-spin" />
            : <><Camera className="w-4 h-4 text-white" /><span className="text-[10px] text-white font-medium">Izmeni</span></>
          }
        </button>
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.svg,.webp" className="hidden" onChange={handleFile} />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Logo kluba</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50 mt-0.5"
        >
          {uploading ? 'Uploadovanje...' : 'Promeni logo'}
        </button>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>JPG, PNG, SVG, WebP · Max 2MB</p>
      </div>
    </div>
  );
}

// ── Password Section ──────────────────────────────────────────────────────────
function PasswordSection() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false, confirm: false });
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.current || !form.newPwd || !form.confirm) { setError('Sva polja su obavezna'); return; }
    if (form.newPwd !== form.confirm) { setError('Nova lozinka se ne podudara sa potvrdom'); return; }
    if (form.newPwd.length < 6) { setError('Nova lozinka mora imati najmanje 6 karaktera'); return; }
    setStatus('saving'); setError('');
    try {
      await usersApi.changePassword({ currentPassword: form.current, newPassword: form.newPwd });
      setStatus('success');
      setForm({ current: '', newPwd: '', confirm: '' });
      setTimeout(() => { setStatus('idle'); setOpen(false); }, 2500);
    } catch (e: any) {
      setStatus('error');
      setError(e?.response?.data?.message || 'Greška pri promeni lozinke');
    } finally {
      if (status !== 'success') setStatus('idle');
    }
  };

  const PwdInput = ({ field, placeholder }: { field: 'current' | 'newPwd' | 'confirm'; placeholder: string }) => (
    <div className="relative">
      <input
        type={showPwd[field] ? 'text' : 'password'}
        className="input-field pr-10"
        placeholder={placeholder}
        value={form[field]}
        onChange={f(field)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
      <button
        type="button"
        onClick={() => setShowPwd((p) => ({ ...p, [field]: !p[field] }))}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        {showPwd[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => { setOpen((p) => !p); setError(''); setStatus('idle'); }}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <p className="form-label mb-0">Lozinka</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>••••••••</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === 'success' && (
            <span className="text-xs text-emerald-400 animate-fade-in inline-flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Promenjeno
            </span>
          )}
          <span className="p-1.5 rounded-lg transition-all hover:bg-orange-500/10 hover:text-orange-400"
            style={{ color: 'var(--text-secondary)' }}>
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3 animate-fade-in">
          <div>
            <label className="form-label">Trenutna lozinka</label>
            <PwdInput field="current" placeholder="Unesite trenutnu lozinku" />
          </div>
          <div>
            <label className="form-label">Nova lozinka</label>
            <PwdInput field="newPwd" placeholder="Minimum 6 karaktera" />
          </div>
          <div>
            <label className="form-label">Potvrdi novu lozinku</label>
            <PwdInput field="confirm" placeholder="Ponovite novu lozinku" />
          </div>
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1 animate-fade-in">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={status === 'saving'} className="btn-primary text-xs py-1.5 px-3">
              {status === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Lock className="w-3.5 h-3.5" /> Promeni lozinku</>}
            </button>
            <button onClick={() => { setOpen(false); setForm({ current: '', newPwd: '', confirm: '' }); setError(''); }} className="btn-secondary text-xs py-1.5 px-3">
              Otkaži
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, iconColor, iconBg, title, desc, children, delay = 0 }: {
  icon: any; iconColor: string; iconBg: string; title: string; desc?: string;
  children: React.ReactNode; delay?: number;
}) {
  return (
    <div className="card overflow-hidden animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {desc && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{desc}</p>}
        </div>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, club, role, logout, updateUser, updateClub } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const roleInfo: Record<string, { label: string; desc: string; color: string }> = {
    club_admin: { label: 'Administrator Kluba', desc: 'Pun pristup — upravljanje klubom, ligama i igračima', color: 'badge-active' },
    organizer:  { label: 'Organizator', desc: 'Unos rezultata i upravljanje mečevima', color: 'badge badge-draw' },
    viewer:     { label: 'Pregledač', desc: 'Samo pregled podataka', color: 'badge' },
  };
  const ri = roleInfo[role || ''] || { label: role || '—', desc: '', color: 'badge' };

  const handleUpdateUser = async (field: 'fullName', value: string) => {
    const updated = await usersApi.updateProfile({ [field]: value });
    updateUser({ [field]: updated[field] });
  };

  const handleUpdateClub = async (field: string, value: string) => {
    const updated = await clubsApi.update(club!.id, { [field]: value });
    updateClub({ [field]: updated[field] });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Topbar title="Podešavanja" />

      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

        {/* ── Profile header ──────────────────────── */}
        <div className="card p-5 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border-2 border-orange-500/20 flex items-center justify-center text-2xl font-bold text-orange-400 shrink-0">
              {(user?.fullName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
                {user?.fullName || 'Korisnik'}
              </p>
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
              <span className={`badge badge-active mt-1.5`}>{ri.label}</span>
            </div>
          </div>
        </div>

        {/* ── Account ─────────────────────────────── */}
        <SectionCard icon={User} iconColor="text-orange-400" iconBg="bg-orange-500/10" title="Nalog" desc="Osnovne informacije o vašem nalogu" delay={50}>
          <EditableField
            label="Ime i Prezime"
            value={user?.fullName || ''}
            placeholder="Unesite vaše ime"
            onSave={(v) => handleUpdateUser('fullName', v)}
          />
          <div className="py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <label className="form-label">Email adresa</label>
            <div className="flex items-center justify-between gap-3 mt-1">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user?.email}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Uskoro
              </span>
            </div>
          </div>
          <PasswordSection />
          {/* Empty last row — no border */}
          <div className="py-1" />
        </SectionCard>

        {/* ── Club ────────────────────────────────── */}
        <SectionCard icon={Building2} iconColor="text-blue-400" iconBg="bg-blue-500/10" title="Klub" desc="Informacije o vašem klubu" delay={100}>
          <LogoUpload />
          <EditableField
            label="Naziv kluba"
            value={club?.name || ''}
            placeholder="Naziv kluba"
            onSave={(v) => handleUpdateClub('name', v)}
          />
          <EditableField
            label="Slug"
            value={club?.slug || ''}
            placeholder="slug-kluba"
            hint={<span className="text-orange-400/80">⚠ Promena slug-a može uticati na javne linkove</span>}
            onSave={(v) => handleUpdateClub('slug', v)}
          />
          <EditableField
            label="Grad"
            value={club?.city || ''}
            placeholder="npr. Beograd"
            onSave={(v) => handleUpdateClub('city', v)}
          />
          <EditableField
            label="Zemlja"
            value={club?.country || ''}
            placeholder="npr. Srbija"
            onSave={(v) => handleUpdateClub('country', v)}
          />
          <div className="py-1" />
        </SectionCard>

        {/* ── Permissions ─────────────────────────── */}
        <SectionCard icon={Shield} iconColor="text-purple-400" iconBg="bg-purple-500/10" title="Ovlašćenja" delay={150}>
          <div className="py-4 flex items-start gap-3">
            <span className={`badge badge-active shrink-0 mt-0.5`}>{ri.label}</span>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ri.desc}</p>
          </div>
          <div
            className="flex items-center gap-2 py-3 text-xs"
            style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400/40 shrink-0" />
            Upravljanje korisnicima i ulogama — dostupno uskoro
          </div>
        </SectionCard>

        {/* ── Subscription ────────────────────────── */}
        <SectionCard icon={CreditCard} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" title="Pretplata" delay={200}>
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Besplatan plan</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Neograničene lige · Do 50 igrača</p>
              </div>
              <span className="badge badge-win">Aktivan</span>
            </div>
            <button
              disabled
              className="w-full py-2.5 text-sm font-medium rounded-xl border cursor-not-allowed opacity-50 transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Upravljaj pretplatom — uskoro
            </button>
          </div>
        </SectionCard>

        {/* ── App Preferences ─────────────────────── */}
        <SectionCard icon={Settings} iconColor="text-slate-400" iconBg="bg-slate-500/10" title="Podešavanja aplikacije" delay={250}>
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tema</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {theme === 'dark' ? 'Tamna tema aktivna' : 'Svetla tema aktivna'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                {theme === 'dark'
                  ? <><Sun className="w-4 h-4 text-orange-400" /> Svetla</>
                  : <><Moon className="w-4 h-4 text-orange-400" /> Tamna</>
                }
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ── Danger Zone ─────────────────────────── */}
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>
            Opasna zona
          </p>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all font-medium text-sm"
            style={{ borderColor: 'rgba(239,68,68,0.25)' }}
          >
            <LogOut className="w-4 h-4" /> Odjavi se
          </button>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
