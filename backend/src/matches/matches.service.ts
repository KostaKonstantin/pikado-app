import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { MatchStatus } from '../common/enums';
import { BracketService } from '../tournaments/bracket.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    private bracketService: BracketService,
  ) {}

  async findOne(id: string) {
    const match = await this.matchRepo.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Meč nije pronađen');
    return match;
  }

  async updateScore(id: string, player1Score: number, player2Score: number) {
    await this.matchRepo.update(id, {
      player1Score,
      player2Score,
      status: MatchStatus.IN_PROGRESS,
      startedAt: new Date(),
    });
    return this.findOne(id);
  }

  async completeMatch(id: string, winnerId: string) {
    const match = await this.findOne(id);
    await this.matchRepo.update(id, {
      winnerId,
      status: MatchStatus.COMPLETED,
      completedAt: new Date(),
    });

    // Advance winner in bracket
    if (match.nextMatchId) {
      await this.bracketService.advanceWinner(id, winnerId);
    }

    return this.findOne(id);
  }

  async resetMatch(id: string) {
    await this.matchRepo.update(id, {
      player1Score: 0,
      player2Score: 0,
      winnerId: undefined,
      status: MatchStatus.PENDING,
      startedAt: undefined,
      completedAt: undefined,
    });
    return this.findOne(id);
  }

  async getTournamentMatches(tournamentId: string) {
    return this.matchRepo.find({
      where: { tournamentId },
      order: { round: 'ASC', matchNumber: 'ASC' },
    });
  }
}
