import { Controller, Get, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { Match } from '../matches/entities/match.entity';
import { Player } from '../players/entities/player.entity';
import { TournamentPlayer } from '../tournaments/entities/tournament-player.entity';
import { League } from '../leagues/entities/league.entity';

@Controller()
export class LiveController {
  constructor(
    @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(Player) private playerRepo: Repository<Player>,
    @InjectRepository(TournamentPlayer) private tpRepo: Repository<TournamentPlayer>,
    @InjectRepository(League) private leagueRepo: Repository<League>,
  ) {}

  @Get('tournaments/by-slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const tournament = await this.tournamentRepo.findOne({ where: { slug } });
    if (!tournament) return null;

    const tournamentPlayers = await this.tpRepo.find({
      where: { tournamentId: tournament.id },
      relations: ['player'],
    });

    const matches = await this.matchRepo.find({
      where: { tournamentId: tournament.id },
      order: { round: 'ASC', matchNumber: 'ASC' },
    });

    const rounds = new Map<number, Match[]>();
    for (const m of matches) {
      if (!rounds.has(m.round)) rounds.set(m.round, []);
      rounds.get(m.round)!.push(m);
    }

    const bracket = Array.from(rounds.entries()).map(([round, ms]) => ({ round, matches: ms }));

    return {
      tournament,
      players: tournamentPlayers.map((tp) => tp.player),
      bracket,
    };
  }

  @Get('leagues/by-slug/:slug')
  async getLeagueBySlug(@Param('slug') slug: string) {
    return this.leagueRepo.findOne({ where: { slug } });
  }
}
