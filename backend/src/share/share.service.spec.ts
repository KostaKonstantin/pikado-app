import { ShareService } from './share.service';

/** buildStandings only touches its arguments, so repos can be null here. */
function makeService(): any {
  return new ShareService(
    null as any, null as any, null as any, null as any,
    null as any, null as any, null as any,
  );
}

const league: any = { pointsWin: 3, pointsDraw: 1, pointsLoss: 0 };
const player = (id: string) => ({ id, fullName: id }) as any;

function match(home: string, away: string, winnerId: string | null, playedAt: string, matchOrder = 0): any {
  return {
    homePlayerId: home,
    awayPlayerId: away,
    winnerId,
    homeSets: winnerId === home ? 3 : 0,
    awaySets: winnerId === away ? 3 : 0,
    playedAt: new Date(playedAt),
    updatedAt: new Date(playedAt),
    sessionNumber: 1,
    roundNumber: 1,
    matchOrder,
  };
}

describe('ShareService.buildStandings — stats fields', () => {
  it('attaches winPct, form and streak to each row', () => {
    const players = [player('a'), player('b')];
    const matches = [
      match('a', 'b', 'a', '2026-03-01', 0),
      match('a', 'b', 'a', '2026-03-02', 1),
    ];

    const rows = makeService().buildStandings(players, matches, league, new Set());
    const a = rows.find((r: any) => r.player.id === 'a');
    const b = rows.find((r: any) => r.player.id === 'b');

    expect(a.winPct).toBe(100);
    expect(a.form).toEqual(['W', 'W']);
    expect(a.streak).toEqual({ type: 'W', count: 2 });

    expect(b.winPct).toBe(0);
    expect(b.form).toEqual(['L', 'L']);
    expect(b.streak).toEqual({ type: 'L', count: 2 });
  });

  it('suppresses form/streak for DNF players but still returns winPct 0', () => {
    const players = [player('a'), player('b')];
    const matches = [match('a', 'b', 'a', '2026-03-01', 0)];

    const rows = makeService().buildStandings(players, matches, league, new Set(['b']));
    const b = rows.find((r: any) => r.player.id === 'b');

    expect(b.isDnf).toBe(true);
    expect(b.form).toEqual([]);
    expect(b.streak).toBeNull();
    expect(b.winPct).toBe(0);
  });

  it('returns winPct 0 and empty form for a player with no matches', () => {
    const players = [player('a'), player('b')];
    const rows = makeService().buildStandings(players, [], league, new Set());
    const a = rows.find((r: any) => r.player.id === 'a');

    expect(a.winPct).toBe(0);
    expect(a.form).toEqual([]);
    expect(a.streak).toBeNull();
  });
});

describe('ShareService.computeProgress — schedule progress', () => {
  it('derives total from the double round-robin formula (31 players → 930)', () => {
    expect(ShareService.computeProgress(31, true, 930)).toEqual({ played: 930, total: 930 });
  });

  it('matches the baraž example (12 players, 21 played → 21/132)', () => {
    expect(ShareService.computeProgress(12, true, 21)).toEqual({ played: 21, total: 132 });
  });

  it('uses single round-robin total when not home/away', () => {
    expect(ShareService.computeProgress(10, false, 0)).toEqual({ played: 0, total: 45 });
  });

  it('returns total 0 for a phase with fewer than 2 players', () => {
    expect(ShareService.computeProgress(1, true, 0)).toEqual({ played: 0, total: 0 });
  });
});
