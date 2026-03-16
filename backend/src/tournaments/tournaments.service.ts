import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentPlayer } from './entities/tournament-player.entity';
import { Match } from '../matches/entities/match.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { BracketService } from './bracket.service';
import { TournamentStatus, TournamentFormat } from '../common/enums';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
    @InjectRepository(TournamentPlayer) private tpRepo: Repository<TournamentPlayer>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    private bracketService: BracketService,
  ) {}

  async findAll(clubId: string, seasonId?: string) {
    const qb = this.tournamentRepo
      .createQueryBuilder('t')
      .where('t.clubId = :clubId', { clubId });
    if (seasonId) qb.andWhere('t.seasonId = :seasonId', { seasonId });
    return qb.orderBy('t.createdAt', 'DESC').getMany();
  }

  async findOne(clubId: string, id: string) {
    const t = await this.tournamentRepo.findOne({ where: { id, clubId } });
    if (!t) throw new NotFoundException('Turnir nije pronađen');
    return t;
  }

  async findBySlug(slug: string) {
    const t = await this.tournamentRepo.findOne({ where: { slug } });
    if (!t) throw new NotFoundException('Turnir nije pronađen');
    return t;
  }

  async create(clubId: string, dto: CreateTournamentDto) {
    const slug = `${slugify(dto.name)}-${Math.random().toString(36).substr(2, 6)}`;
    const tournament = this.tournamentRepo.create({ ...dto, clubId, slug });
    return this.tournamentRepo.save(tournament);
  }

  async update(clubId: string, id: string, data: Partial<CreateTournamentDto>) {
    await this.findOne(clubId, id);
    await this.tournamentRepo.update({ id, clubId }, data);
    return this.findOne(clubId, id);
  }

  async remove(clubId: string, id: string) {
    await this.findOne(clubId, id);
    await this.matchRepo.delete({ tournamentId: id });
    await this.tpRepo.delete({ tournamentId: id });
    await this.tournamentRepo.delete({ id, clubId });
  }

  async addPlayer(clubId: string, tournamentId: string, playerId: string) {
    await this.findOne(clubId, tournamentId);
    const count = await this.tpRepo.count({ where: { tournamentId } });
    if (count >= 64) throw new BadRequestException('Maksimalan broj igrača je 64');

    const tp = this.tpRepo.create({ tournamentId, playerId, seed: count + 1 });
    return this.tpRepo.save(tp);
  }

  async removePlayer(clubId: string, tournamentId: string, playerId: string) {
    await this.findOne(clubId, tournamentId);
    await this.tpRepo.delete({ tournamentId, playerId });
  }

  async getPlayers(clubId: string, tournamentId: string) {
    await this.findOne(clubId, tournamentId);
    return this.tpRepo.find({
      where: { tournamentId },
      relations: ['player'],
      order: { seed: 'ASC' },
    });
  }

  async updateSeeds(clubId: string, tournamentId: string, seeds: { playerId: string; seed: number }[]) {
    await this.findOne(clubId, tournamentId);
    for (const s of seeds) {
      await this.tpRepo.update({ tournamentId, playerId: s.playerId }, { seed: s.seed });
    }
    return this.getPlayers(clubId, tournamentId);
  }

  async generateBracket(clubId: string, tournamentId: string) {
    const tournament = await this.findOne(clubId, tournamentId);
    const players = await this.tpRepo.find({
      where: { tournamentId },
      order: { seed: 'ASC' },
    });

    if (players.length < 2) {
      throw new BadRequestException('Potrebna su najmanje 2 igrača');
    }

    let matches: any[];
    switch (tournament.format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        matches = await this.bracketService.generateSingleElimination(tournamentId, players);
        break;
      case TournamentFormat.DOUBLE_ELIMINATION:
        matches = await this.bracketService.generateDoubleElimination(tournamentId, players);
        break;
      case TournamentFormat.ROUND_ROBIN:
        matches = await this.bracketService.generateRoundRobin(tournamentId, players);
        break;
      default:
        matches = await this.bracketService.generateSingleElimination(tournamentId, players);
    }

    await this.tournamentRepo.update({ id: tournamentId }, {
      status: TournamentStatus.REGISTRATION,
    });

    return { tournament, matchCount: matches.length };
  }

  async start(clubId: string, tournamentId: string) {
    const tournament = await this.findOne(clubId, tournamentId);
    await this.tournamentRepo.update({ id: tournamentId }, {
      status: TournamentStatus.IN_PROGRESS,
    });
    return { ...tournament, status: TournamentStatus.IN_PROGRESS };
  }

  async getBracket(clubId: string, tournamentId: string) {
    await this.findOne(clubId, tournamentId);
    return this.bracketService.getBracket(tournamentId);
  }
}
