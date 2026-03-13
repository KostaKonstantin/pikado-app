'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { tournamentsApi } from '@/lib/api/tournaments.api';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { BracketView } from '@/components/tournament/bracket/bracket-view';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function BracketPage() {
  const params = useParams();
  const { club, role } = useAuthStore();
  const id = params.id as string;
  const [tournament, setTournament] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [playerMap, setPlayerMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const canEdit = role === 'club_admin' || role === 'organizer';

  const load = useCallback(async () => {
    if (!club?.id) return;
    try {
      const [t, bracket, players] = await Promise.all([
        tournamentsApi.getOne(club.id, id),
        tournamentsApi.getBracket(club.id, id),
        playersApi.getAll(club.id),
      ]);
      setTournament(t);
      setRounds(bracket);
      const pm: Record<string, any> = {};
      players.forEach((p: any) => { pm[p.id] = p; });
      setPlayerMap(pm);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [club?.id, id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Topbar
        title={tournament ? `${tournament.name} – Kostur` : 'Kostur'}
        actions={
          <button onClick={load} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4" /> Osveži
          </button>
        }
      />
      <div className="p-6">
        <Link href={`/tournaments/${id}`} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Nazad na turnir
        </Link>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Učitavanje kostura...</div>
        ) : (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-white">Turnirski Kostur</h3>
              <div className="flex gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-orange-500/30 border border-orange-500" />
                  Aktivan meč
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-orange-500/20" />
                  Pobednik
                </span>
              </div>
            </div>
            <BracketView
              rounds={rounds}
              players={playerMap}
              canEdit={canEdit && tournament?.status === 'in_progress'}
              onUpdate={load}
            />
          </div>
        )}
      </div>
    </div>
  );
}
