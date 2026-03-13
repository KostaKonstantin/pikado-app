import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeagueMatch } from './entities/league-match.entity';

@Injectable()
export class FixtureService {
  constructor(
    @InjectRepository(LeagueMatch) private leagueMatchRepo: Repository<LeagueMatch>,
  ) {}

  /**
   * Circle algorithm for round-robin fixture generation.
   * With N players, generates N-1 rounds (single format) or 2*(N-1) rounds (home/away).
   */
  async generateFixtures(
    leagueId: string,
    playerIds: string[],
    homeAway: boolean = false,
  ): Promise<LeagueMatch[]> {
    const ids = [...playerIds];
    if (ids.length % 2 !== 0) ids.push(null); // Virtual BYE
    const n = ids.length;
    const rounds = n - 1;
    const allMatches: LeagueMatch[] = [];

    const createRound = async (roundNum: number, reversed: boolean) => {
      for (let i = 0; i < n / 2; i++) {
        const home = reversed ? ids[n - 1 - i] : ids[i];
        const away = reversed ? ids[i] : ids[n - 1 - i];
        if (!home || !away) continue;

        const match = this.leagueMatchRepo.create({
          leagueId,
          homePlayerId: home,
          awayPlayerId: away,
          roundNumber: roundNum,
        });
        allMatches.push(match);
      }

      // Rotate: keep first fixed, rotate rest
      ids.splice(1, 0, ids.pop());
    };

    for (let r = 0; r < rounds; r++) {
      await createRound(r + 1, false);
    }

    if (homeAway) {
      // Reset rotation and generate return fixtures
      const original = [...playerIds];
      if (original.length % 2 !== 0) original.push(null);
      ids.length = 0;
      ids.push(...original);

      for (let r = 0; r < rounds; r++) {
        await createRound(rounds + r + 1, true);
      }
    }

    return this.leagueMatchRepo.save(allMatches);
  }
}
