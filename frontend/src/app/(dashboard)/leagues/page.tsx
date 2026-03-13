'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { leaguesApi } from '@/lib/api/leagues.api';
import { Topbar } from '@/components/layout/topbar';
import { Swords, Plus, ChevronRight } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = { draft: 'Nacrt', active: 'Aktivna', completed: 'Završena' };
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  active: 'bg-green-500/20 text-green-400',
  completed: 'bg-slate-700 text-slate-400',
};

export default function LeaguesPage() {
  const { club } = useAuthStore();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club?.id) return;
    leaguesApi.getAll(club.id).then(setLeagues).finally(() => setLoading(false));
  }, [club?.id]);

  return (
    <div>
      <Topbar
        title="Lige"
        actions={
          <Link href="/leagues/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Kreiraj Ligu
          </Link>
        }
      />
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card p-6 h-36 animate-pulse bg-slate-800" />)}
          </div>
        ) : leagues.length === 0 ? (
          <div className="text-center py-24">
            <Swords className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nema Liga</h3>
            <p className="text-slate-400 mb-6">Kreirajte prvu ligu za vaš klub</p>
            <Link href="/leagues/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Kreiraj Ligu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((l) => (
              <Link key={l.id} href={`/leagues/${l.id}`}
                className="card p-6 hover:border-slate-600 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Swords className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className={`badge text-xs ${STATUS_COLORS[l.status] || ''}`}>
                    {STATUS_LABELS[l.status] || l.status}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">{l.name}</h3>
                <p className="text-slate-400 text-sm">{l.format === 'home_away' ? 'Domaći/Gostujući' : 'Jednostruki'}</p>
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
                  <span>{l.setsPerMatch} set(a) · {l.startingScore || 501}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
