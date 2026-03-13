'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Target, Wifi, WifiOff, Trophy } from 'lucide-react';
import QRCode from 'react-qr-code';
import api from '@/lib/api/client';
import { getCheckout, formatCheckout } from '@/lib/checkout/checkout-data';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export default function LivePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tournament, setTournament] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [checkout, setCheckout] = useState<number | ''>('');
  const [checkoutResult, setCheckoutResult] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load tournament by slug
    api.get(`/tournaments/by-slug/${slug}`).catch(() => {}).then((r: any) => {
      if (r?.data) {
        setTournament(r.data?.tournament);
        const pm: Record<string, any> = {};
        (r.data?.players || []).forEach((p: any) => { pm[p.id] = p; });
        setPlayers(pm);
        setRounds(r.data?.bracket || []);
      }
    }).finally(() => setLoading(false));

    // WS connection
    const s = io(WS_URL, { transports: ['websocket', 'polling'] });
    s.on('connect', () => {
      setConnected(true);
      s.emit('join:tournament', { tournamentId: slug });
      s.emit('join:screen', { slug });
    });
    s.on('disconnect', () => setConnected(false));

    s.on('bracket:updated', (data: any) => {
      if (data.bracket) setRounds(data.bracket);
    });

    s.on('score:updated', (data: any) => {
      setRounds((prev) => prev.map((round) => ({
        ...round,
        matches: round.matches.map((m: any) =>
          m.id === data.matchId
            ? { ...m, player1Score: data.player1Score, player2Score: data.player2Score, status: 'in_progress' }
            : m
        ),
      })));
    });

    s.on('match:completed', (data: any) => {
      setRounds((prev) => prev.map((round) => ({
        ...round,
        matches: round.matches.map((m: any) =>
          m.id === data.matchId ? { ...m, ...data, status: 'completed' } : m
        ),
      })));
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [slug]);

  const calcCheckout = (val: number) => {
    const routes = getCheckout(val);
    setCheckoutResult(routes || []);
  };

  const currentMatches = rounds.flatMap((r) => r.matches.filter((m: any) => m.status === 'in_progress'));
  const pendingMatches = rounds.flatMap((r) => r.matches.filter((m: any) => m.status === 'pending' && !m.isBye && m.player1Id && m.player2Id));
  const completedMatches = rounds.flatMap((r) => r.matches.filter((m: any) => m.status === 'completed')).reverse();

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{tournament?.name || 'Live Turnir'}</h1>
            <p className="text-slate-400 text-xs">Pikado Live</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <span className="flex items-center gap-1.5 text-green-400">
              <Wifi className="w-4 h-4" /> Povezan
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-red-400">
              <WifiOff className="w-4 h-4" /> Nije povezan
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Matches */}
        <div className="lg:col-span-2 space-y-4">
          {currentMatches.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-live" /> Trenutni Mečevi
              </h2>
              {currentMatches.map((m: any) => (
                <div key={m.id} className="card p-4 border-orange-500/30 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="font-semibold text-white">{players[m.player1Id]?.fullName || '—'}</p>
                    </div>
                    <div className="mx-4 text-center">
                      <p className="text-3xl font-bold text-orange-400">{m.player1Score} : {m.player2Score}</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="font-semibold text-white">{players[m.player2Id]?.fullName || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingMatches.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sledeći Mečevi</h2>
              {pendingMatches.slice(0, 3).map((m: any) => (
                <div key={m.id} className="card p-3 mb-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-right text-slate-300">{players[m.player1Id]?.fullName || '—'}</span>
                    <span className="text-slate-500 text-xs font-medium">vs</span>
                    <span className="flex-1 text-slate-300">{players[m.player2Id]?.fullName || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bracket Rounds */}
          {rounds.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Turnirski Kostur</h2>
              <div className="overflow-x-auto">
                <div className="flex gap-4 min-w-max">
                  {rounds.map(({ round, matches }: any) => (
                    <div key={round} className="min-w-[160px]">
                      <p className="text-xs text-slate-500 text-center mb-2">Runda {round}</p>
                      <div className="space-y-2">
                        {matches.map((m: any) => (
                          <div key={m.id} className={`p-2 rounded-lg border text-xs ${
                            m.status === 'completed' ? 'border-slate-700 opacity-70' :
                            m.status === 'in_progress' ? 'border-orange-500/50 bg-orange-500/5' :
                            'border-slate-700'
                          }`}>
                            <p className={m.winnerId === m.player1Id ? 'text-orange-400 font-semibold' : 'text-slate-300'}>
                              {players[m.player1Id]?.fullName || (m.isBye ? 'BYE' : '—')}
                              {m.status !== 'pending' && ` (${m.player1Score})`}
                            </p>
                            <p className={m.winnerId === m.player2Id ? 'text-orange-400 font-semibold' : 'text-slate-300'}>
                              {players[m.player2Id]?.fullName || (m.isBye ? 'BYE' : '—')}
                              {m.status !== 'pending' && ` (${m.player2Score})`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Checkout Calc + Completed + QR */}
        <div className="space-y-4">
          {/* Checkout Calculator */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" /> Kalkulator Završnice
            </h3>
            <input
              type="number"
              className="input-field text-center text-xl font-bold mb-3"
              placeholder="Preostalo"
              min={2}
              max={170}
              value={checkout}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setCheckout(val || '');
                if (val >= 2 && val <= 170) calcCheckout(val);
                else setCheckoutResult([]);
              }}
            />
            {checkout !== '' && checkoutResult.length > 0 ? (
              <div className="space-y-2">
                {checkoutResult.map((route, i) => (
                  <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center">
                    <p className="text-orange-400 font-semibold text-sm">{route.join(' → ')}</p>
                  </div>
                ))}
              </div>
            ) : checkout !== '' ? (
              <p className="text-slate-500 text-sm text-center">Nema završnice</p>
            ) : null}
          </div>

          {/* Completed Matches */}
          {completedMatches.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Završeni Mečevi</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {completedMatches.map((m: any) => (
                  <div key={m.id} className="text-xs flex items-center gap-2">
                    <Trophy className="w-3 h-3 text-orange-400 shrink-0" />
                    <span className={m.winnerId === m.player1Id ? 'text-orange-400 font-semibold' : 'text-slate-400'}>
                      {players[m.player1Id]?.fullName || '—'}
                    </span>
                    <span className="text-slate-600">{m.player1Score}:{m.player2Score}</span>
                    <span className={m.winnerId === m.player2Id ? 'text-orange-400 font-semibold' : 'text-slate-400'}>
                      {players[m.player2Id]?.fullName || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="card p-4 flex flex-col items-center">
            <p className="text-xs text-slate-400 mb-3">Skeniraj za live praćenje</p>
            <div className="bg-white p-3 rounded-lg">
              <QRCode value={typeof window !== 'undefined' ? window.location.href : ''} size={100} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
