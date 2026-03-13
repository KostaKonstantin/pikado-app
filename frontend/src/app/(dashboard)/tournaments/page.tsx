'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { tournamentsApi } from '@/lib/api/tournaments.api';
import { Topbar } from '@/components/layout/topbar';
import { Trophy, Plus, Play, Users, ChevronRight } from 'lucide-react';

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Ispadanje',
  double_elimination: 'Dvostruko Ispadanje',
  round_robin: 'Kružni Sistem',
  group_knockout: 'Grupe + Ispadanje',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nacrt',
  registration: 'Registracija',
  in_progress: 'U toku',
  completed: 'Završen',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  registration: 'bg-orange-500/20 text-orange-400',
  in_progress: 'bg-green-500/20 text-green-400',
  completed: 'bg-slate-700 text-slate-400',
};

export default function TournamentsPage() {
  const { club } = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club?.id) return;
    tournamentsApi.getAll(club.id)
      .then(setTournaments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [club?.id]);

  return (
    <div>
      <Topbar
        title="Turniri"
        actions={
          <Link href="/tournaments/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Kreiraj Turnir
          </Link>
        }
      />
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card p-6 h-40 animate-pulse bg-slate-800" />)}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-24">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nema Turnira</h3>
            <p className="text-slate-400 mb-6">Kreirajte prvi turnir za vaš klub</p>
            <Link href="/tournaments/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Kreiraj Turnir
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`}
                className="card p-6 hover:border-slate-600 transition-all hover:shadow-lg group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className={`badge text-xs ${STATUS_COLORS[t.status] || ''}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1 group-hover:text-orange-400 transition-colors">{t.name}</h3>
                <p className="text-slate-400 text-sm">{FORMAT_LABELS[t.format] || t.format}</p>
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {t.startingScore || 501}
                    </span>
                    <span>{t.setsToWin || 1} set(a)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
