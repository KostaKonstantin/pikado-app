import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { CreatePlayerDto } from './dto/create-player.dto';
import { Match } from '../matches/entities/match.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';
import { MatchStatus } from '../common/enums';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player) private playerRepo: Repository<Player>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(LeagueMatch) private leagueMatchRepo: Repository<LeagueMatch>,
  ) {}

  async findAll(clubId: string, search?: string) {
    const qb = this.playerRepo
      .createQueryBuilder('p')
      .where('p.clubId = :clubId', { clubId })
      .andWhere('p.isActive = true');

    if (search) {
      qb.andWhere('(p.fullName ILIKE :s OR p.nickname ILIKE :s)', { s: `%${search}%` });
    }

    return qb.orderBy('p.fullName', 'ASC').getMany();
  }

  async findOne(clubId: string, id: string) {
    const player = await this.playerRepo.findOne({ where: { id, clubId } });
    if (!player) throw new NotFoundException('Igrač nije pronađen');
    return player;
  }

  async create(clubId: string, dto: CreatePlayerDto) {
    const player = this.playerRepo.create({ ...dto, clubId });
    return this.playerRepo.save(player);
  }

  async update(clubId: string, id: string, dto: Partial<CreatePlayerDto>) {
    await this.findOne(clubId, id);
    await this.playerRepo.update({ id, clubId }, dto);
    return this.findOne(clubId, id);
  }

  async remove(clubId: string, id: string) {
    await this.findOne(clubId, id);
    await this.playerRepo.update({ id, clubId }, { isActive: false });
  }

  async getStats(clubId: string, playerId: string) {
    await this.findOne(clubId, playerId);

    const tournamentMatches = await this.matchRepo.find({
      where: [
        { player1Id: playerId, status: MatchStatus.COMPLETED },
        { player2Id: playerId, status: MatchStatus.COMPLETED },
      ],
    });

    const leagueMatches = await this.leagueMatchRepo.find({
      where: [
        { homePlayerId: playerId, status: MatchStatus.COMPLETED },
        { awayPlayerId: playerId, status: MatchStatus.COMPLETED },
      ],
    });

    let wins = 0, losses = 0, draws = 0;

    for (const m of tournamentMatches) {
      if (m.winnerId === playerId) wins++;
      else if (m.winnerId) losses++;
    }

    for (const m of leagueMatches) {
      if (m.winnerId === playerId) wins++;
      else if (m.winnerId === null && m.status === MatchStatus.COMPLETED) draws++;
      else if (m.winnerId) losses++;
    }

    const total = wins + losses + draws;
    return {
      matchesPlayed: total,
      wins,
      losses,
      draws,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  }

  async getHistory(clubId: string, playerId: string) {
    await this.findOne(clubId, playerId);

    const tournamentMatches = await this.matchRepo.find({
      where: [{ player1Id: playerId }, { player2Id: playerId }],
      order: { createdAt: 'DESC' },
    });

    const leagueMatches = await this.leagueMatchRepo.find({
      where: [{ homePlayerId: playerId }, { awayPlayerId: playerId }],
      relations: ['homePlayer', 'awayPlayer', 'league'],
      order: { createdAt: 'DESC' },
    });

    return { tournamentMatches, leagueMatches };
  }
}
