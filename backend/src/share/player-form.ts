/**
 * Pure helpers for the share page's per-player stats (win %, recent form,
 * current streak). Kept free of TypeORM/Nest so the logic is unit-testable in
 * isolation; `ShareService.buildStandings` feeds it the already-fetched
 * completed matches.
 */

export type Outcome = 'W' | 'D' | 'L';

/** The subset of a completed LeagueMatch needed to derive a player's form. */
export interface FormMatchInput {
  winnerId: string | null;
  homePlayerId: string | null;
  awayPlayerId: string | null;
  /** When the match was actually played; preferred recency signal. */
  playedAt?: Date | null;
  /** Fallback recency signal when `playedAt` is not set. */
  updatedAt?: Date | null;
  sessionNumber?: number;
  roundNumber?: number;
  matchOrder?: number;
}

/** Whole-number win percentage; 0 when no matches were played. */
export function winPercent(won: number, played: number): number {
  return played === 0 ? 0 : Math.round((won / played) * 100);
}

/** Outcome of a completed match from `playerId`'s perspective. */
export function outcomeFor(playerId: string, match: FormMatchInput): Outcome {
  if (match.winnerId === null) return 'D';
  return match.winnerId === playerId ? 'W' : 'L';
}

function recencyKey(m: FormMatchInput): number {
  const ts = m.playedAt ?? m.updatedAt;
  return ts ? ts.getTime() : 0;
}

function compareRecency(a: FormMatchInput, b: FormMatchInput): number {
  const byTime = recencyKey(a) - recencyKey(b);
  if (byTime !== 0) return byTime;
  const bySession = (a.sessionNumber ?? a.roundNumber ?? 0) - (b.sessionNumber ?? b.roundNumber ?? 0);
  if (bySession !== 0) return bySession;
  return (a.matchOrder ?? 0) - (b.matchOrder ?? 0);
}

/**
 * Given a player's completed matches (in any order), return the last ≤4
 * outcomes oldest→newest and the current streak (consecutive identical
 * most-recent outcomes). `streak` is null when the player has no matches.
 */
export function buildPlayerForm(
  playerId: string,
  matches: FormMatchInput[],
): { form: Outcome[]; streak: { type: Outcome; count: number } | null } {
  const outcomes = [...matches].sort(compareRecency).map((m) => outcomeFor(playerId, m));

  if (outcomes.length === 0) return { form: [], streak: null };

  const form = outcomes.slice(-4);

  const latest = outcomes[outcomes.length - 1];
  let count = 0;
  for (let i = outcomes.length - 1; i >= 0 && outcomes[i] === latest; i--) count++;

  return { form, streak: { type: latest, count } };
}
