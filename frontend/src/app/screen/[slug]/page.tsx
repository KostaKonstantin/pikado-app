'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Target, Wifi, WifiOff } from 'lucide-react';
import api from '@/lib/api/client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export default function ScreenPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tournament, setTournament] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [connected, setConnected] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.get(`/tournaments/by-slug/${slug}`).catch(() => {}).then((r: any) => {
      if (r?.data) {
        setTournament(r.data?.tournament);
        const pm: Record<string, any> = {};
        (r.data?.players || []).forEach((p: any) => { pm[p.id] = p; });
        setPlayers(pm);
        setRounds(r.data?.bracket || []);
      }
    });

    const s = io(WS_URL, { transports: ['websocket', 'polling'] });
    s.on('connect', () => {
      setConnected(true);
      s.emit('join:screen', { slug });
    });
    s.on('disconnect', () => setConnected(false));

    s.on('bracket:updated', (data: any) => { if (data.bracket) setRounds(data.bracket); });
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

    return () => { s.disconnect(); };
  }, [slug]);

  const currentMatches = rounds.flatMap((r) => r.matches.filter((m: any) => m.status === 'in_progress'));
  const nextMatches = rounds.flatMap((r) => r.matches.filter((m: any) => m.status === 'pending' && !m.isBye && m.player1Id && m.player2Id));

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Target className="w-8 h-8 text-white" />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">PIKADO</h1>
            <p className="text-orange-100 text-sm">{tournament?.name || 'Live Turnir'}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-3xl font-mono font-bold text-white">
              {time.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-orange-100 text-sm">
              {time.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${connected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-sm font-medium">{connected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Matches */}
        <div>
          <h2 className="text-xs font-black tracking-[0.3em] text-orange-400 uppercase mb-6 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
            TRENUTNI MEČEVI
          </h2>
          {currentMatches.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-lg">
              Nema aktivnih mečeva
            </div>
          ) : (
            <div className="space-y-6">
              {currentMatches.map((m: any) => (
                <div key={m.id} className="bg-[#1a2535] border border-slate-700 rounded-2xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-1 text-center">
                        <p className="text-2xl font-bold text-white leading-tight">
                          {players[m.player1Id]?.fullName || '—'}
                        </p>
                        {players[m.player1Id]?.nickname && (
                          <p className="text-slate-400 text-sm">"{players[m.player1Id].nickname}"</p>
                        )}
                      </div>
                      <div className="mx-8">
                        <div className="bg-orange-500 rounded-2xl px-6 py-4 text-center">
                          <p className="text-5xl font-black text-white tracking-tight">
                            {m.player1Score} <span className="text-orange-300">:</span> {m.player2Score}
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-2xl font-bold text-white leading-tight">
                          {players[m.player2Id]?.fullName || '—'}
                        </p>
                        {players[m.player2Id]?.nickname && (
                          <p className="text-slate-400 text-sm">"{players[m.player2Id].nickname}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-500/10 px-6 py-2 border-t border-orange-500/20">
                    <p className="text-xs text-orange-400 text-center font-semibold tracking-wider uppercase">
                      U TOKU
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Matches + Bracket */}
        <div className="space-y-6">
          {nextMatches.length > 0 && (
            <div>
              <h2 className="text-xs font-black tracking-[0.3em] text-slate-400 uppercase mb-4">
                SLEDEĆI MEČ
              </h2>
              <div className="space-y-3">
                {nextMatches.slice(0, 3).map((m: any) => (
                  <div key={m.id} className="bg-[#1a2535] border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex-1 text-right text-white font-medium">
                        {players[m.player1Id]?.fullName || '—'}
                      </span>
                      <span className="text-slate-500 font-bold">VS</span>
                      <span className="flex-1 text-white font-medium">
                        {players[m.player2Id]?.fullName || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xs font-black tracking-[0.3em] text-slate-400 uppercase mb-4">
              TURNIRSKI KOSTUR
            </h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {rounds.slice(0, 4).map(({ round, matches }: any) => (
                  <div key={round} className="min-w-[140px]">
                    <p className="text-xs text-slate-500 font-medium text-center mb-2">Runda {round}</p>
                    <div className="space-y-2">
                      {matches.map((m: any) => (
                        <div key={m.id} className={`p-2 rounded-lg border text-xs ${
                          m.status === 'completed' ? 'border-slate-800 bg-slate-800/30' :
                          m.status === 'in_progress' ? 'border-orange-500/50 bg-orange-500/5 animate-live' :
                          'border-slate-700/50'
                        }`}>
                          <p className={`leading-tight ${m.winnerId === m.player1Id ? 'text-orange-400 font-bold' : 'text-slate-300'}`}>
                            {players[m.player1Id]?.fullName?.split(' ')[0] || '—'}
                          </p>
                          <p className={`leading-tight ${m.winnerId === m.player2Id ? 'text-orange-400 font-bold' : 'text-slate-300'}`}>
                            {players[m.player2Id]?.fullName?.split(' ')[0] || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#0d1526] border-t border-slate-800 px-8 py-3 flex items-center justify-between text-xs text-slate-500">
        <span>Pikado Platforma © 2025</span>
        <span className="font-mono">/screen/{slug}</span>
      </div>
    </div>
  );
}
