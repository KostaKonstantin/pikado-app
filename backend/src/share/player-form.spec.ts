import { outcomeFor, buildPlayerForm, winPercent, FormMatchInput } from './player-form';

const at = (iso: string): Date => new Date(iso);

/** Build a completed-match input where `playerId` is the home player. */
function match(
  overrides: Partial<FormMatchInput> & { winnerId: string | null },
): FormMatchInput {
  return {
    homePlayerId: 'p1',
    awayPlayerId: 'opp',
    sessionNumber: 1,
    roundNumber: 1,
    matchOrder: 0,
    playedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe('winPercent', () => {
  it('rounds wins over matches played to a whole percent', () => {
    expect(winPercent(6, 8)).toBe(75);
  });

  it('returns 0 when no matches were played (no divide-by-zero)', () => {
    expect(winPercent(0, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(winPercent(5, 8)).toBe(63); // 62.5 -> 63
  });
});

describe('outcomeFor', () => {
  it('is a win when the player is the winner', () => {
    expect(outcomeFor('p1', match({ winnerId: 'p1' }))).toBe('W');
  });

  it('is a loss when the opponent is the winner', () => {
    expect(outcomeFor('p1', match({ winnerId: 'opp' }))).toBe('L');
  });

  it('is a draw when there is no winner', () => {
    expect(outcomeFor('p1', match({ winnerId: null }))).toBe('D');
  });
});

describe('buildPlayerForm', () => {
  it('orders outcomes oldest -> newest by playedAt', () => {
    const matches = [
      match({ winnerId: 'opp', playedAt: at('2026-03-03') }), // L (newest)
      match({ winnerId: 'p1', playedAt: at('2026-03-01') }),  // W (oldest)
      match({ winnerId: null, playedAt: at('2026-03-02') }),  // D (middle)
    ];
    const { form } = buildPlayerForm('p1', matches);
    expect(form).toEqual(['W', 'D', 'L']);
  });

  it('keeps only the last 4 outcomes', () => {
    const matches = [1, 2, 3, 4, 5].map((d) =>
      match({ winnerId: 'p1', playedAt: at(`2026-03-0${d}`) }),
    );
    const { form } = buildPlayerForm('p1', matches);
    expect(form).toHaveLength(4);
    expect(form).toEqual(['W', 'W', 'W', 'W']);
  });

  it('counts the current streak from the most recent match', () => {
    const matches = [
      match({ winnerId: 'opp', playedAt: at('2026-03-01') }), // L
      match({ winnerId: 'p1', playedAt: at('2026-03-02') }),  // W
      match({ winnerId: 'p1', playedAt: at('2026-03-03') }),  // W
      match({ winnerId: 'p1', playedAt: at('2026-03-04') }),  // W (latest)
    ];
    expect(buildPlayerForm('p1', matches).streak).toEqual({ type: 'W', count: 3 });
  });

  it('resets the streak when the latest outcome differs', () => {
    const matches = [
      match({ winnerId: 'p1', playedAt: at('2026-03-01') }),  // W
      match({ winnerId: 'p1', playedAt: at('2026-03-02') }),  // W
      match({ winnerId: 'opp', playedAt: at('2026-03-03') }), // L (latest)
    ];
    expect(buildPlayerForm('p1', matches).streak).toEqual({ type: 'L', count: 1 });
  });

  it('reports a draw streak', () => {
    const matches = [
      match({ winnerId: null, playedAt: at('2026-03-01') }),
      match({ winnerId: null, playedAt: at('2026-03-02') }),
    ];
    expect(buildPlayerForm('p1', matches).streak).toEqual({ type: 'D', count: 2 });
  });

  it('returns empty form and null streak when there are no matches', () => {
    expect(buildPlayerForm('p1', [])).toEqual({ form: [], streak: null });
  });

  it('returns fewer than 4 entries when fewer matches were played', () => {
    const matches = [
      match({ winnerId: 'p1', playedAt: at('2026-03-01') }),
      match({ winnerId: 'opp', playedAt: at('2026-03-02') }),
    ];
    expect(buildPlayerForm('p1', matches).form).toEqual(['W', 'L']);
  });

  it('falls back to updatedAt when playedAt is missing', () => {
    const matches = [
      match({ winnerId: 'opp', playedAt: null, updatedAt: at('2026-03-05') }), // newest
      match({ winnerId: 'p1', playedAt: null, updatedAt: at('2026-03-01') }),  // oldest
    ];
    expect(buildPlayerForm('p1', matches).form).toEqual(['W', 'L']);
  });

  it('breaks ties on equal timestamps by session then match order', () => {
    const ts = at('2026-03-01');
    const matches = [
      match({ winnerId: 'opp', playedAt: ts, sessionNumber: 1, matchOrder: 2 }), // L second
      match({ winnerId: 'p1', playedAt: ts, sessionNumber: 1, matchOrder: 1 }),  // W first
    ];
    expect(buildPlayerForm('p1', matches).form).toEqual(['W', 'L']);
  });

  it('recognises the player as the away side too', () => {
    const matches = [
      match({ winnerId: 'p1', homePlayerId: 'opp', awayPlayerId: 'p1', playedAt: at('2026-03-01') }),
    ];
    expect(buildPlayerForm('p1', matches).form).toEqual(['W']);
  });
});
