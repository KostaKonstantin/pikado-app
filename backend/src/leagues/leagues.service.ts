import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    const slug = `${slugify(data.name ?? '')}-${Math.random().toString(36).substr(2, 6)}`;
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
    await this.lmRepo.delete({ leagueId: id });
    await this.lpRepo.delete({ leagueId: id });
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

    // Clear any previously generated fixtures before regenerating
    await this.lmRepo.delete({ leagueId });

    const matches = await this.fixtureService.generateFixtures(leagueId, playerIds, false);

    await this.leagueRepo.update({ id: leagueId }, { status: LeagueStatus.ACTIVE });
    return { matchCount: matches.length };
  }

  async getFixtures(clubId: string, leagueId: string) {
    await this.findOne(clubId, leagueId);
    return this.lmRepo.find({
      where: { leagueId },
      relations: ['homePlayer', 'awayPlayer'],
      order: { matchOrder: 'ASC' },
    });
  }

  async updateMatchResult(
    clubId: string,
    leagueId: string,
    matchId: string,
    homeSets: number,
    awaySets: number,
  ) {
    const league = await this.findOne(clubId, leagueId);
    const match = await this.lmRepo.findOne({ where: { id: matchId, leagueId } });
    if (!match) throw new NotFoundException('Meč nije pronađen');

    const max = league.setsPerMatch === 1 ? league.legsPerSet : league.setsPerMatch;
    if (homeSets < 0 || awaySets < 0) {
      throw new BadRequestException('Rezultat ne može biti negativan');
    }
    if (homeSets > max || awaySets > max) {
      throw new BadRequestException(`Maksimalan broj setova/legova je ${max}`);
    }
    if (homeSets === 0 && awaySets === 0) {
      throw new BadRequestException('Rezultat ne može biti 0:0');
    }
    const isDecisive = Math.max(homeSets, awaySets) === max;
    const isDraw = homeSets === awaySets && homeSets === max - 1;
    if (!isDecisive && !isDraw) {
      throw new BadRequestException(
        `Validan rezultat: pobeda (${max}:0 – ${max}:${max - 1}) ili remi (${max - 1}:${max - 1})`,
      );
    }

    let winnerId: string | null = null;
    if (homeSets > awaySets) winnerId = match.homePlayerId;
    else if (awaySets > homeSets) winnerId = match.awayPlayerId;

    await this.lmRepo.update(matchId, {
      homeSets,
      awaySets,
      winnerId: winnerId ?? undefined,
      status: MatchStatus.COMPLETED,
      playedAt: new Date(),
    });

    return this.lmRepo.findOne({ where: { id: matchId }, relations: ['homePlayer', 'awayPlayer'] });
  }

  private validateSubstitutionInput(
    substitutions: { absentId: string; substituteId: string }[],
    eveningPending: LeagueMatch[],
  ) {
    if (substitutions.length === 0) throw new BadRequestException('Nema zamena za primenu');

    const subIds = substitutions.map((s) => s.substituteId);
    if (new Set(subIds).size !== subIds.length) {
      throw new BadRequestException('Isti igrač ne može biti dve zamene');
    }

    const absentIds = new Set(substitutions.map((s) => s.absentId));
    const subIdSet = new Set(subIds);
    if ([...subIdSet].some((id) => subIdSet.has(id) && absentIds.has(id) && !substitutions.find((s) => s.absentId === id && s.substituteId === id))) {
      // allow — handled below
    }

    const eveningIds = new Set<string>();
    for (const m of eveningPending) {
      eveningIds.add(m.homePlayerId);
      eveningIds.add(m.awayPlayerId);
    }

    for (const sub of substitutions) {
      if (eveningIds.has(sub.substituteId) && !absentIds.has(sub.substituteId)) {
        throw new BadRequestException(`Zamena već igra tu večer`);
      }
    }

    if (eveningPending.length === 0) {
      throw new BadRequestException('Nema otvorenih mečeva te večeri');
    }
  }

  // Builds a map: sortedPairKey → match record (for all matches in the league)
  private buildMatchMap(matches: LeagueMatch[]): Map<string, LeagueMatch> {
    const map = new Map<string, LeagueMatch>();
    for (const m of matches) {
      const key = [m.homePlayerId, m.awayPlayerId].sort().join('|||');
      map.set(key, m);
    }
    return map;
  }

  async previewSubstitutions(
    clubId: string,
    leagueId: string,
    eveningNumber: number,
    substitutions: { absentId: string; substituteId: string }[],
  ) {
    await this.findOne(clubId, leagueId);

    if (substitutions.length === 0) return { willPostpone: [], willCreate: [], willMove: [], willSkip: [], warnings: [] };

    const eveningPending = await this.lmRepo.find({
      where: { leagueId, sessionNumber: eveningNumber, status: MatchStatus.PENDING, isPostponed: false },
    });

    this.validateSubstitutionInput(substitutions, eveningPending);

    const substituteMap = new Map(substitutions.map((s) => [s.absentId, s.substituteId]));
    const absentSet = new Set(substitutions.map((s) => s.absentId));

    const allMatches = await this.lmRepo.find({ where: { leagueId } });
    const matchMap = this.buildMatchMap(allMatches);

    const willPostpone: { homePlayerId: string; awayPlayerId: string }[] = [];
    const willCreate: { homePlayerId: string; awayPlayerId: string }[] = [];
    const willMove: { homePlayerId: string; awayPlayerId: string; fromEvening: number }[] = [];
    const willSkip: { homePlayerId: string; awayPlayerId: string; reason: string }[] = [];
    const handled = new Set<string>();

    for (const match of eveningPending) {
      const homeIsAbsent = absentSet.has(match.homePlayerId);
      const awayIsAbsent = absentSet.has(match.awayPlayerId);
      if (!homeIsAbsent && !awayIsAbsent) continue;

      willPostpone.push({ homePlayerId: match.homePlayerId, awayPlayerId: match.awayPlayerId });

      const newHomeId = homeIsAbsent ? substituteMap.get(match.homePlayerId)! : match.homePlayerId;
      const newAwayId = awayIsAbsent ? substituteMap.get(match.awayPlayerId)! : match.awayPlayerId;
      if (newHomeId === newAwayId) continue;

      const key = [newHomeId, newAwayId].sort().join('|||');
      if (handled.has(key)) continue;
      handled.add(key);

      const existing = matchMap.get(key);
      if (!existing) {
        willCreate.push({ homePlayerId: newHomeId, awayPlayerId: newAwayId });
      } else if (existing.status === MatchStatus.COMPLETED) {
        willSkip.push({ homePlayerId: newHomeId, awayPlayerId: newAwayId, reason: `već odigrano ${existing.homeSets}:${existing.awaySets}` });
      } else {
        // PENDING in another evening (or postponed) → move to this evening
        willMove.push({ homePlayerId: newHomeId, awayPlayerId: newAwayId, fromEvening: existing.sessionNumber });
      }
    }

    const warnings: string[] = [];
    for (const sub of substitutions) {
      const playsThisEvening =
        willCreate.some((m) => m.homePlayerId === sub.substituteId || m.awayPlayerId === sub.substituteId) ||
        willMove.some((m) => m.homePlayerId === sub.substituteId || m.awayPlayerId === sub.substituteId);
      if (!playsThisEvening) {
        warnings.push(`${sub.substituteId}:nema_protivnika`);
      }
    }

    return { willPostpone, willCreate, willMove, willSkip, warnings };
  }

  async applySubstitutions(
    clubId: string,
    leagueId: string,
    eveningNumber: number,
    substitutions: { absentId: string; substituteId: string }[],
  ) {
    await this.findOne(clubId, leagueId);

    const eveningPending = await this.lmRepo.find({
      where: { leagueId, sessionNumber: eveningNumber, status: MatchStatus.PENDING, isPostponed: false },
    });

    this.validateSubstitutionInput(substitutions, eveningPending);

    const substituteMap = new Map(substitutions.map((s) => [s.absentId, s.substituteId]));
    const absentSet = new Set(substitutions.map((s) => s.absentId));

    const allMatches = await this.lmRepo.find({ where: { leagueId } });
    const matchMap = this.buildMatchMap(allMatches);

    const maxOrderResult = await this.lmRepo
      .createQueryBuilder('lm')
      .select('MAX(lm.matchOrder)', 'max')
      .where('lm.leagueId = :leagueId', { leagueId })
      .getRawOne();
    let nextOrder: number = (maxOrderResult?.max ?? 0) + 1;

    let postponed = 0;
    let created = 0;
    let moved = 0;
    let skipped = 0;
    const handled = new Set<string>();

    for (const match of eveningPending) {
      const homeIsAbsent = absentSet.has(match.homePlayerId);
      const awayIsAbsent = absentSet.has(match.awayPlayerId);
      if (!homeIsAbsent && !awayIsAbsent) continue;

      // Postpone X's original match — X still owes this game
      await this.lmRepo.update(match.id, { isPostponed: true });
      postponed++;

      const newHomeId = homeIsAbsent ? substituteMap.get(match.homePlayerId)! : match.homePlayerId;
      const newAwayId = awayIsAbsent ? substituteMap.get(match.awayPlayerId)! : match.awayPlayerId;
      if (newHomeId === newAwayId) continue;

      const key = [newHomeId, newAwayId].sort().join('|||');
      if (handled.has(key)) continue;
      handled.add(key);

      const existing = matchMap.get(key);

      if (!existing) {
        // No match exists — create fresh
        const newMatch = this.lmRepo.create({
          leagueId,
          homePlayerId: newHomeId,
          awayPlayerId: newAwayId,
          roundNumber: eveningNumber,
          sessionNumber: eveningNumber,
          matchOrder: nextOrder++,
          status: MatchStatus.PENDING,
          isPostponed: false,
        });
        await this.lmRepo.save(newMatch);
        created++;
      } else if (existing.status === MatchStatus.COMPLETED) {
        // Already played — nothing to do
        skipped++;
      } else {
        // PENDING match in another evening → move it here
        await this.lmRepo.update(existing.id, {
          sessionNumber: eveningNumber,
          roundNumber: eveningNumber,
          matchOrder: nextOrder++,
          isPostponed: false,
        });
        moved++;
      }
    }

    return { postponed, created, moved, skipped };
  }

  async postponeMatch(
    clubId: string,
    leagueId: string,
    matchId: string,
    data: { scheduledDate?: string | null; isPostponed?: boolean },
  ) {
    await this.findOne(clubId, leagueId);
    const match = await this.lmRepo.findOne({ where: { id: matchId, leagueId } });
    if (!match) throw new NotFoundException('Meč nije pronađen');

    const update: Partial<LeagueMatch> = {};
    if (data.isPostponed !== undefined) update.isPostponed = data.isPostponed;
    if (data.scheduledDate !== undefined) {
      update.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
    }

    await this.lmRepo.update(matchId, update);
    return this.lmRepo.findOne({ where: { id: matchId }, relations: ['homePlayer', 'awayPlayer'] });
  }

  async getStandings(clubId: string, leagueId: string) {
    const league = await this.findOne(clubId, leagueId);
    const players = await this.lpRepo.find({ where: { leagueId }, relations: ['player'] });
    const matches = await this.lmRepo.find({
      where: { leagueId, status: MatchStatus.COMPLETED },
    });

    // Count postponed matches per player
    const postponedMatches = await this.lmRepo.find({
      where: { leagueId, status: MatchStatus.PENDING, isPostponed: true },
    });
    const postponedCount = new Map<string, number>();
    for (const m of postponedMatches) {
      postponedCount.set(m.homePlayerId, (postponedCount.get(m.homePlayerId) ?? 0) + 1);
      postponedCount.set(m.awayPlayerId, (postponedCount.get(m.awayPlayerId) ?? 0) + 1);
    }

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
      .map((s, i) => ({ position: i + 1, ...s, postponed: postponedCount.get(s.player?.id) ?? 0 }));
  }
}
