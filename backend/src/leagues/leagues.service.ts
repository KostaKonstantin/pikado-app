import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { League } from './entities/league.entity';
import { LeaguePlayer } from './entities/league-player.entity';
import { LeagueMatch } from './entities/league-match.entity';
import { FixtureService } from './fixture.service';
import { MatchStatus, LeagueStatus, LeagueFormat } from '../common/enums';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class LeaguesService {
  constructor(
    @InjectRepository(League) private leagueRepo: Repository<League>,
    @InjectRepository(LeaguePlayer) private lpRepo: Repository<LeaguePlayer>,
    @InjectRepository(LeagueMatch) private lmRepo: Repository<LeagueMatch>,
    private fixtureService: FixtureService,
  ) {}

  async findAll(clubId: string, seasonId?: string) {
    const qb = this.leagueRepo
      .createQueryBuilder('l')
      .where('l.clubId = :clubId', { clubId });
    if (seasonId) qb.andWhere('l.seasonId = :seasonId', { seasonId });
    return qb.orderBy('l.createdAt', 'DESC').getMany();
  }

  async findOne(clubId: string, id: string) {
    const l = await this.leagueRepo.findOne({ where: { id, clubId } });
    if (!l) throw new NotFoundException('Liga nije pronađena');
    return l;
  }

  async findBySlug(slug: string) {
    const l = await this.leagueRepo.findOne({ where: { slug } });
    if (!l) throw new NotFoundException('Liga nije pronađena');
    return l;
  }

  async create(clubId: string, data: Partial<League>) {
    const slug = `${slugify(data.name)}-${Math.random().toString(36).substr(2, 6)}`;
    const league = this.leagueRepo.create({ ...data, clubId, slug });
    return this.leagueRepo.save(league);
  }

  async update(clubId: string, id: string, data: Partial<League>) {
    await this.findOne(clubId, id);
    await this.leagueRepo.update({ id, clubId }, data);
    return this.findOne(clubId, id);
  }

  async remove(clubId: string, id: string) {
    await this.findOne(clubId, id);
    await this.leagueRepo.delete({ id, clubId });
  }

  async addPlayer(clubId: string, leagueId: string, playerId: string) {
    await this.findOne(clubId, leagueId);
    const lp = this.lpRepo.create({ leagueId, playerId });
    return this.lpRepo.save(lp);
  }

  async removePlayer(clubId: string, leagueId: string, playerId: string) {
    await this.findOne(clubId, leagueId);
    await this.lpRepo.delete({ leagueId, playerId });
  }

  async getPlayers(clubId: string, leagueId: string) {
    await this.findOne(clubId, leagueId);
    return this.lpRepo.find({
      where: { leagueId },
      relations: ['player'],
    });
  }

  async generateFixtures(clubId: string, leagueId: string) {
    const league = await this.findOne(clubId, leagueId);
    const leaguePlayers = await this.lpRepo.find({ where: { leagueId } });
    const playerIds = leaguePlayers.map((lp) => lp.playerId);

    const homeAway = league.format === LeagueFormat.HOME_AWAY;
    const matches = await this.fixtureService.generateFixtures(leagueId, playerIds, homeAway);

    await this.leagueRepo.update({ id: leagueId }, { status: LeagueStatus.ACTIVE });
    return { matchCount: matches.length };
  }

  async getFixtures(clubId: string, leagueId: string) {
    await this.findOne(clubId, leagueId);
    return this.lmRepo.find({
      where: { leagueId },
      relations: ['homePlayer', 'awayPlayer'],
      order: { roundNumber: 'ASC' },
    });
  }

  async updateMatchResult(
    clubId: string,
    leagueId: string,
    matchId: string,
    homeSets: number,
    awaySets: number,
  ) {
    await this.findOne(clubId, leagueId);
    const match = await this.lmRepo.findOne({ where: { id: matchId, leagueId } });
    if (!match) throw new NotFoundException('Meč nije pronađen');

    const league = await this.findOne(clubId, leagueId);
    let winnerId: string | null = null;
    if (homeSets > awaySets) winnerId = match.homePlayerId;
    else if (awaySets > homeSets) winnerId = match.awayPlayerId;

    await this.lmRepo.update(matchId, {
      homeSets,
      awaySets,
      winnerId,
      status: MatchStatus.COMPLETED,
      playedAt: new Date(),
    });

    return this.lmRepo.findOne({ where: { id: matchId }, relations: ['homePlayer', 'awayPlayer'] });
  }

  async getStandings(clubId: string, leagueId: string) {
    const league = await this.findOne(clubId, leagueId);
    const players = await this.lpRepo.find({ where: { leagueId }, relations: ['player'] });
    const matches = await this.lmRepo.find({
      where: { leagueId, status: MatchStatus.COMPLETED },
    });

    const statsMap = new Map<string, {
      player: any;
      played: number;
      won: number;
      lost: number;
      drawn: number;
      setsFor: number;
      setsAgainst: number;
      points: number;
    }>();

    for (const lp of players) {
      statsMap.set(lp.playerId, {
        player: lp.player,
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        setsFor: 0,
        setsAgainst: 0,
        points: 0,
      });
    }

    for (const m of matches) {
      const home = statsMap.get(m.homePlayerId);
      const away = statsMap.get(m.awayPlayerId);
      if (!home || !away) continue;

      home.played++;
      away.played++;
      home.setsFor += m.homeSets;
      home.setsAgainst += m.awaySets;
      away.setsFor += m.awaySets;
      away.setsAgainst += m.homeSets;

      if (m.winnerId === m.homePlayerId) {
        home.won++;
        home.points += league.pointsWin;
        away.lost++;
        away.points += league.pointsLoss;
      } else if (m.winnerId === m.awayPlayerId) {
        away.won++;
        away.points += league.pointsWin;
        home.lost++;
        home.points += league.pointsLoss;
      } else {
        home.drawn++;
        away.drawn++;
        home.points += league.pointsDraw;
        away.points += league.pointsDraw;
      }
    }

    return Array.from(statsMap.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aSetDiff = a.setsFor - a.setsAgainst;
        const bSetDiff = b.setsFor - b.setsAgainst;
        return bSetDiff - aSetDiff;
      })
      .map((s, i) => ({ position: i + 1, ...s }));
  }
}
