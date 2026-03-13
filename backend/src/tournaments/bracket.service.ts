import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../matches/entities/match.entity';
import { TournamentPlayer } from './entities/tournament-player.entity';
import { MatchStatus, TournamentFormat } from '../common/enums';

@Injectable()
export class BracketService {
  constructor(
    @InjectRepository(Match) private matchRepo: Repository<Match>,
  ) {}

  /** Next power of 2 >= n */
  private nextPow2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  /** Standard bracket seeding for size slots */
  private generateSeeds(size: number): number[][] {
    let rounds: number[][] = [[1, 2]];
    while (rounds[0].length < size) {
      rounds = [rounds.flatMap((pair) => [pair[0], size + 1 - pair[0]])];
    }
    // Rebuild as pairs
    const flat = rounds[0];
    const pairs: number[][] = [];
    for (let i = 0; i < flat.length; i += 2) {
      pairs.push([flat[i], flat[i + 1]]);
    }
    return pairs;
  }

  async generateSingleElimination(
    tournamentId: string,
    players: TournamentPlayer[],
  ): Promise<Match[]> {
    const n = players.length;
    const size = this.nextPow2(n);
    const byeCount = size - n;

    // Sort by seed
    const sorted = [...players].sort((a, b) => (a.seed || 999) - (b.seed || 999));

    // Assign BYEs to top seeds
    const slots: (TournamentPlayer | null)[] = [
      ...sorted,
      ...Array(byeCount).fill(null),
    ];

    const seedPairs = this.generateSeeds(size);
    const round1Matches: Match[] = [];

    for (let i = 0; i < seedPairs.length; i++) {
      const [s1, s2] = seedPairs[i];
      const p1 = slots[s1 - 1];
      const p2 = slots[s2 - 1];
      const isBye = !p1 || !p2;

      const match = this.matchRepo.create({
        tournamentId,
        round: 1,
        matchNumber: i + 1,
        player1Id: p1?.playerId || null,
        player2Id: p2?.playerId || null,
        isBye,
        status: isBye ? MatchStatus.BYE : MatchStatus.PENDING,
        winnerId: isBye ? (p1?.playerId || p2?.playerId) : null,
      });
      round1Matches.push(match);
    }

    // Save round 1
    const saved = await this.matchRepo.save(round1Matches);

    // Generate subsequent rounds
    const allMatches: Match[] = [...saved];
    let prevRound = saved;
    let roundNum = 2;

    while (prevRound.length > 1) {
      const nextRound: Match[] = [];
      for (let i = 0; i < prevRound.length; i += 2) {
        const match = this.matchRepo.create({
          tournamentId,
          round: roundNum,
          matchNumber: Math.floor(i / 2) + 1,
          status: MatchStatus.PENDING,
        });
        nextRound.push(match);
      }
      const savedNext = await this.matchRepo.save(nextRound);

      // Link previous round to next
      for (let i = 0; i < prevRound.length; i++) {
        const nextMatch = savedNext[Math.floor(i / 2)];
        const slot = (i % 2) + 1;
        await this.matchRepo.update(prevRound[i].id, {
          nextMatchId: nextMatch.id,
          nextMatchSlot: slot,
        });
        prevRound[i].nextMatchId = nextMatch.id;
        prevRound[i].nextMatchSlot = slot;
      }

      allMatches.push(...savedNext);
      prevRound = savedNext;
      roundNum++;
    }

    // Auto-advance BYE matches
    for (const m of saved.filter((m) => m.isBye)) {
      await this.advanceWinner(m.id, m.winnerId);
    }

    return allMatches;
  }

  async generateDoubleElimination(
    tournamentId: string,
    players: TournamentPlayer[],
  ): Promise<Match[]> {
    // Winner bracket (same as single elimination)
    const winnerMatches = await this.generateSingleElimination(tournamentId, players);

    // Mark all winner bracket matches
    await this.matchRepo.update(
      winnerMatches.map((m) => m.id),
      { bracketSide: 'winner' },
    );

    const n = players.length;
    const size = this.nextPow2(n);
    const loserRounds = Math.log2(size) * 2 - 2;

    // Generate loser bracket skeleton
    const loserMatches: Match[] = [];
    let loserMatchCount = size / 2;
    for (let r = 1; r <= loserRounds; r++) {
      for (let i = 1; i <= loserMatchCount; i++) {
        const match = this.matchRepo.create({
          tournamentId,
          round: 1000 + r,
          matchNumber: i,
          status: MatchStatus.PENDING,
          bracketSide: 'loser',
        });
        loserMatches.push(match);
      }
      if (r % 2 === 0) loserMatchCount = Math.max(1, loserMatchCount / 2);
    }

    const savedLoser = await this.matchRepo.save(loserMatches);

    // Grand final
    const grandFinal = await this.matchRepo.save(
      this.matchRepo.create({
        tournamentId,
        round: 9999,
        matchNumber: 1,
        status: MatchStatus.PENDING,
        bracketSide: 'grand_final',
      }),
    );

    return [...winnerMatches, ...savedLoser, grandFinal];
  }

  async generateRoundRobin(
    tournamentId: string,
    players: TournamentPlayer[],
  ): Promise<Match[]> {
    const ids = players.map((p) => p.playerId);
    // Add virtual BYE if odd
    if (ids.length % 2 !== 0) ids.push(null);
    const n = ids.length;
    const rounds = n - 1;
    const matches: Match[] = [];

    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < n / 2; i++) {
        const p1 = ids[i];
        const p2 = ids[n - 1 - i];
        if (!p1 || !p2) continue;

        matches.push(
          this.matchRepo.create({
            tournamentId,
            round: r + 1,
            matchNumber: i + 1,
            player1Id: p1,
            player2Id: p2,
            status: MatchStatus.PENDING,
          }),
        );
      }
      // Rotate (keep first fixed)
      ids.splice(1, 0, ids.pop());
    }

    return this.matchRepo.save(matches);
  }

  async advanceWinner(matchId: string, winnerId: string): Promise<void> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match || !match.nextMatchId) return;

    const nextMatch = await this.matchRepo.findOne({ where: { id: match.nextMatchId } });
    if (!nextMatch) return;

    if (match.nextMatchSlot === 1) {
      await this.matchRepo.update(nextMatch.id, { player1Id: winnerId });
    } else {
      await this.matchRepo.update(nextMatch.id, { player2Id: winnerId });
    }
  }

  async getBracket(tournamentId: string) {
    const matches = await this.matchRepo.find({
      where: { tournamentId },
      order: { round: 'ASC', matchNumber: 'ASC' },
    });

    const rounds = new Map<number, Match[]>();
    for (const m of matches) {
      if (!rounds.has(m.round)) rounds.set(m.round, []);
      rounds.get(m.round).push(m);
    }

    return Array.from(rounds.entries()).map(([round, matches]) => ({
      round,
      matches,
    }));
  }
}
