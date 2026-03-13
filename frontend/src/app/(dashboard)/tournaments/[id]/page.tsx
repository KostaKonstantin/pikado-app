'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { tournamentsApi } from '@/lib/api/tournaments.api';
import { playersApi } from '@/lib/api/players.api';
import { Topbar } from '@/components/layout/topbar';
import { Trophy, Users, Play, Plus, Trash2, QrCode, ExternalLink, ArrowLeft } from 'lucide-react';
import QRCode from 'react-qr-code';

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Ispadanje',
  double_elimination: 'Dvostruko Ispadanje',
  round_robin: 'Kružni Sistem',
  group_knockout: 'Grupe + Ispadanje',
};

export default function TournamentDetailPage() {
  const params = useParams();
  const { club, role } = useAuthStore();
  const [tournament, setTournament] = useState<any>(null);
  const [tPlayers, setTPlayers] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const canEdit = role === 'club_admin' || role === 'organizer';
  const id = params.id as string;

  const load = async () => {
    if (!club?.id) return;
    const [t, tp, players] = await Promise.all([
      tournamentsApi.getOne(club.id, id),
      tournamentsApi.getPlayers(club.id, id),
      playersApi.getAll(club.id),
    ]);
    setTournament(t);
    setTPlayers(tp);
    setAllPlayers(players);
    setLoading(false);
  };

  useEffect(() => { load(); }, [club?.id, id]);

  const addPlayer = async (playerId: string) => {
    if (!club?.id) return;
    await tournamentsApi.addPlayer(club.id, id, playerId);
    load();
  };

  const removePlayer = async (playerId: string) => {
    if (!club?.id) return;
    await tournamentsApi.removePlayer(club.id, id, playerId);
    load();
  };

  const generate = async () => {
    if (!club?.id) return;
    setGenerating(true);
    try {
      await tournamentsApi.generate(club.id, id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Greška');
    } finally {
      setGenerating(false);
    }
  };

  const start = async () => {
    if (!club?.id) return;
    await tournamentsApi.start(club.id, id);
    load();
  };

  const registeredIds = new Set(tPlayers.map((tp) => tp.playerId));
  const availablePlayers = allPlayers.filter((p) => !registeredIds.has(p.id));
  const liveUrl = `${window?.location?.origin}/live/${tournament?.slug}`;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400">Učitavanje...</div></div>;
  if (!tournament) return null;

  return (
    <div>
      <Topbar
        title={tournament.name}
        actions={
          <div className="flex gap-2">
            <Link href={`/live/${tournament.slug}`} target="_blank"
              className="btn-secondary text-sm">
              <ExternalLink className="w-4 h-4" /> Live
            </Link>
            <button onClick={() => setShowQr(!showQr)} className="btn-secondary text-sm">
              <QrCode className="w-4 h-4" /> QR Kod
            </button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Link href="/tournaments" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Svi turniri
        </Link>

        {/* QR Code Modal */}
        {showQr && (
          <div className="card p-6 flex flex-col items-center gap-4 max-w-xs">
            <p className="text-sm text-slate-400">Skeniraj za live praćenje:</p>
            <div className="bg-white p-4 rounded-xl">
              <QRCode value={liveUrl} size={160} />
            </div>
            <p className="text-xs text-slate-400 text-center break-all">{liveUrl}</p>
          </div>
        )}

        {/* Info Card */}
        <div className="card p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Format', value: FORMAT_LABELS[tournament.format] || tournament.format },
              { label: 'Polazni rezultat', value: tournament.startingScore || 501 },
              { label: 'Setova za pobedu', value: tournament.setsToWin || 1 },
              { label: 'Legova po setu', value: tournament.legsPerSet || 3 },
            ].map((info) => (
              <div key={info.label}>
                <p className="text-xs text-slate-400 mb-1">{info.label}</p>
                <p className="text-white font-medium">{info.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Players Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Igrači ({tPlayers.length})
            </h3>
            {canEdit && tournament.status === 'draft' && (
              <button onClick={() => setShowAddPlayer(!showAddPlayer)} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> Dodaj Igrača
              </button>
            )}
          </div>

          {/* Add player dropdown */}
          {showAddPlayer && availablePlayers.length > 0 && (
            <div className="mb-4 p-3 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-400 mb-2">Izaberi igrača:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availablePlayers.map((p) => (
                  <button key={p.id} onClick={() => addPlayer(p.id)}
                    className="text-left p-2 rounded bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors">
                    {p.fullName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tPlayers.length === 0 ? (
            <p className="text-slate-400 text-sm">Nema prijavljenih igrača</p>
          ) : (
            <div className="space-y-2">
              {tPlayers.map((tp, i) => (
                <div key={tp.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-5">{tp.seed || i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                      {tp.player?.fullName?.[0] || '?'}
                    </div>
                    <span className="text-sm text-white">{tp.player?.fullName}</span>
                  </div>
                  {canEdit && tournament.status === 'draft' && (
                    <button onClick={() => removePlayer(tp.playerId)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-3">
            {tournament.status === 'draft' && (
              <button onClick={generate} disabled={generating || tPlayers.length < 2} className="btn-primary">
                {generating ? 'Generisanje...' : 'Generiši Kostur'}
              </button>
            )}
            {tournament.status === 'registration' && (
              <>
                <button onClick={start} className="btn-primary">
                  <Play className="w-4 h-4" /> Pokreni Turnir
                </button>
                <Link href={`/tournaments/${id}/bracket`} className="btn-secondary">
                  Pogledaj Kostur
                </Link>
              </>
            )}
            {tournament.status === 'in_progress' && (
              <Link href={`/tournaments/${id}/bracket`} className="btn-primary">
                <Trophy className="w-4 h-4" /> Kostur Turnira
              </Link>
            )}
          </div>
        )}
        {tournament.status !== 'draft' && (
          <Link href={`/tournaments/${id}/bracket`} className="btn-secondary inline-flex">
            <Trophy className="w-4 h-4" /> Pogledaj Kostur
          </Link>
        )}
      </div>
    </div>
  );
}
