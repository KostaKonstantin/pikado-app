'use client';
import { useState } from 'react';
import { matchesApi } from '@/lib/api/matches.api';

interface BracketMatch {
  id: string;
  player1Id: string | null;
  player2Id: string | null;
  player1Score: number;
  player2Score: number;
  winnerId: string | null;
  status: string;
  isBye: boolean;
  round: number;
  matchNumber: number;
}

interface BracketRound {
  round: number;
  matches: BracketMatch[];
}

interface PlayerMap {
  [id: string]: { fullName: string; nickname?: string };
}

interface BracketViewProps {
  rounds: BracketRound[];
  players: PlayerMap;
  canEdit?: boolean;
  onUpdate?: () => void;
}

const ROUND_LABELS: Record<number, string> = {
  1: 'Prva runda',
  2: 'Druga runda',
  3: 'Četvrtfinale',
  4: 'Polufinale',
  5: 'Finale',
};

function getRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Finale';
  if (fromEnd === 1) return 'Polufinale';
  if (fromEnd === 2) return 'Četvrtfinale';
  return ROUND_LABELS[round] || `Runda ${round}`;
}

function MatchCard({
  match,
  players,
  canEdit,
  onUpdate,
}: {
  match: BracketMatch;
  players: PlayerMap;
  canEdit?: boolean;
  onUpdate?: () => void;
}) {
  const [scores, setScores] = useState({ p1: match.player1Score, p2: match.player2Score });
  const [saving, setSaving] = useState(false);

  const p1 = match.player1Id ? players[match.player1Id] : null;
  const p2 = match.player2Id ? players[match.player2Id] : null;

  const isActive = match.status === 'in_progress';
  const isCompleted = match.status === 'completed';
  const isBye = match.isBye || match.status === 'bye';

  const saveScore = async () => {
    setSaving(true);
    try {
      await matchesApi.updateScore(match.id, scores.p1, scores.p2);
      onUpdate?.();
    } finally {
      setSaving(false);
    }
  };

  const completeMatch = async (winnerId: string) => {
    setSaving(true);
    try {
      await matchesApi.complete(match.id, winnerId);
      onUpdate?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bracket-match w-52 ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
      {/* Player 1 */}
      <div className={`bracket-player border-b border-slate-700 ${
        isCompleted && match.winnerId === match.player1Id ? 'winner' : ''
      } ${isBye && !match.player1Id ? 'bye' : ''}`}>
        <span className="truncate max-w-[130px]">
          {p1 ? p1.fullName : (isBye ? 'BYE' : '—')}
        </span>
        <span className="font-bold ml-2 text-sm">
          {isCompleted || isActive ? scores.p1 : ''}
        </span>
      </div>

      {/* Player 2 */}
      <div className={`bracket-player ${
        isCompleted && match.winnerId === match.player2Id ? 'winner' : ''
      } ${isBye && !match.player2Id ? 'bye' : ''}`}>
        <span className="truncate max-w-[130px]">
          {p2 ? p2.fullName : (isBye ? 'BYE' : '—')}
        </span>
        <span className="font-bold ml-2 text-sm">
          {isCompleted || isActive ? scores.p2 : ''}
        </span>
      </div>

      {/* Score input for active matches */}
      {canEdit && !isCompleted && !isBye && p1 && p2 && (
        <div className="p-2 bg-slate-900 border-t border-slate-700">
          <div className="flex gap-1 mb-2">
            <input
              type="number"
              className="w-full text-center bg-slate-700 text-white rounded p-1 text-sm"
              min={0}
              value={scores.p1}
              onChange={(e) => setScores({ ...scores, p1: parseInt(e.target.value) || 0 })}
              placeholder={p1.fullName.split(' ')[0]}
            />
            <span className="text-slate-400 self-center">:</span>
            <input
              type="number"
              className="w-full text-center bg-slate-700 text-white rounded p-1 text-sm"
              min={0}
              value={scores.p2}
              onChange={(e) => setScores({ ...scores, p2: parseInt(e.target.value) || 0 })}
              placeholder={p2.fullName.split(' ')[0]}
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => completeMatch(match.player1Id!)}
              disabled={saving}
              className="flex-1 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded p-1 transition-colors"
            >
              Pobeda {p1.fullName.split(' ')[0]}
            </button>
            <button
              onClick={() => completeMatch(match.player2Id!)}
              disabled={saving}
              className="flex-1 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded p-1 transition-colors"
            >
              Pobeda {p2.fullName.split(' ')[0]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BracketView({ rounds, players, canEdit, onUpdate }: BracketViewProps) {
  const totalRounds = rounds.length;

  if (!rounds.length) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Kostur nije generisan</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max px-4 py-4 items-start">
        {rounds.map(({ round, matches }) => (
          <div key={round} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3 px-2">
              {getRoundLabel(round, totalRounds)}
            </p>
            <div
              className="flex flex-col"
              style={{ gap: `${Math.pow(2, round - 1) * 16 + 8}px` }}
            >
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  players={players}
                  canEdit={canEdit}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
