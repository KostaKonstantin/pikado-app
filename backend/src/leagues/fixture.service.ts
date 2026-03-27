import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeagueMatch } from './entities/league-match.entity';

// ─── Pure math helpers (no hardcoded values) ─────────────────────────────────
//
// SINGLE round-robin for N players:
//   N even → rounds = N-1,  matches/round = N/2,   total = N*(N-1)/2
//   N odd  → rounds = N,    matches/round = (N-1)/2, total = N*(N-1)/2
//
// DOUBLE round-robin (homeAway = true):
//   rounds  = singleRounds * 2
//   total   = singleTotal  * 2
//   matches/round unchanged
//
// Verification:
//   N=40 double → rounds=78, mpr=20, total=1560  ✓
//   N=10 double → rounds=18, mpr=5,  total=90    ✓
//   N=7  double → rounds=14, mpr=3,  total=42    ✓
// ─────────────────────────────────────────────────────────────────────────────
export function rrStats(n: number, homeAway: boolean) {
  if (n < 2) return { rounds: 0, matchesPerRound: 0, totalMatches: 0, hasOddPlayers: false };
  const isEven = n % 2 === 0;
  const singleRounds = isEven ? n - 1 : n;
  const matchesPerRound = isEven ? n / 2 : Math.floor(n / 2);
  const singleTotal = (n * (n - 1)) / 2;
  return {
    rounds: homeAway ? singleRounds * 2 : singleRounds,
    matchesPerRound,
    totalMatches: homeAway ? singleTotal * 2 : singleTotal,
    hasOddPlayers: !isEven,
  };
}

@Injectable()
export class FixtureService {
  constructor(
    @InjectRepository(LeagueMatch) private leagueMatchRepo: Repository<LeagueMatch>,
  ) {}

  // ─── Circle Method ──────────────────────────────────────────────────────────
  //
  // The Circle Method (polygon algorithm) is the only algorithm that guarantees:
  //   • Exactly ⌊N/2⌋ matches per round
  //   • Exactly the correct number of rounds
  //   • Every pair plays exactly once (single RR)
  //
  // Algorithm:
  //   1. For EVEN N: fix the last player; rotate the remaining N-1 players.
  //      Round r = 0..N-2:
  //        rot = rotate(rotating, r)           // left-shift by r
  //        match[0] = (fixed,  rot[0])
  //        match[i] = (rot[i], rot[N-1-i])   for i = 1..N/2-1
  //
  //   2. For ODD N: add a BYE ghost player to make the count even.
  //      Fix BYE; rotate all N real players.
  //      Any pair that involves BYE is simply omitted (that player rests).
  //      Produces N rounds with floor(N/2) real matches each.
  //
  // Pair correctness proof (N even, 0-indexed):
  //   rot has indices 0..N-2.
  //   match[0] uses index 0; match[i] uses indices i and N-1-i.
  //   For i=1..N/2-1: i < N-1-i  (since i < N/2) → indices never collide.
  //   Fixed is never in rot → no self-pairings.
  //   Across all rounds, every unordered pair {a,b} appears exactly once. ✓
  // ───────────────────────────────────────────────────────────────────────────
  private buildRoundRobinRounds(playerIds: string[]): [string, string][][] {
    const n = playerIds.length;
    if (n < 2) return [];

    const BYE = '__BYE__';
    const isOdd = n % 2 !== 0;

    // For odd N: BYE is fixed; all real players rotate.
    // For even N: last real player is fixed; rest rotate.
    const fixed = isOdd ? BYE : playerIds[n - 1];
    const rotating = isOdd ? [...playerIds] : playerIds.slice(0, n - 1);

    const N = rotating.length + 1; // always even
    const numRounds = N - 1;
    const rounds: [string, string][][] = [];

    for (let r = 0; r < numRounds; r++) {
      const round: [string, string][] = [];

      // Rotate `rotating` left by r positions
      const rot = [...rotating.slice(r), ...rotating.slice(0, r)];

      // Pair fixed vs rot[0]
      if (fixed !== BYE && rot[0] !== BYE) {
        round.push([fixed, rot[0]]);
      }

      // Pair rot[i] vs rot[N-1-i], for i = 1 … N/2-1
      for (let i = 1; i <= N / 2 - 1; i++) {
        const home = rot[i];
        const away = rot[N - 1 - i]; // N-1-i because rot has N-1 elements (0..N-2)
        if (home !== BYE && away !== BYE) {
          round.push([home, away]);
        }
      }

      if (round.length > 0) rounds.push(round);
    }

    return rounds;
  }

  async generateFixtures(
    leagueId: string,
    playerIds: string[],
    homeAway = false,
    mode = 'round',
  ): Promise<LeagueMatch[]> {
    if (playerIds.length < 2) {
      throw new BadRequestException('Potrebna su najmanje 2 igrača za generisanje rasporeda');
    }

    // Circuit 1: single round-robin — every pair plays once
    const firstCircuit = this.buildRoundRobinRounds(playerIds);

    const allRounds: [string, string][][] = [...firstCircuit];

    if (homeAway) {
      // Circuit 2: same round groupings, home/away flipped (§3 — двокружни систем)
      // Player who was home in circuit 1 becomes away in circuit 2, and vice versa.
      const secondCircuit = firstCircuit.map((round) =>
        round.map(([home, away]): [string, string] => [away, home]),
      );
      allRounds.push(...secondCircuit);
    }

    // Persist — one DB row per match, ordered by round then match position
    const allMatches: LeagueMatch[] = [];
    let order = 0;

    for (let r = 0; r < allRounds.length; r++) {
      const roundNum = r + 1;
      for (const [home, away] of allRounds[r]) {
        allMatches.push(
          this.leagueMatchRepo.create({
            leagueId,
            homePlayerId: home,
            awayPlayerId: away,
            // Round mode: assign round numbers upfront for fixed schedule
            // Session mode: leave at 0 — assigned dynamically per evening
            roundNumber: mode === 'session' ? 0 : roundNum,
            sessionNumber: mode === 'session' ? 0 : roundNum,
            matchOrder: order++,
          }),
        );
      }
    }

    return this.leagueMatchRepo.save(allMatches);
  }
}
