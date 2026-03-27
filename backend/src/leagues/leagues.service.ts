import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { League } from './entities/league.entity';
import { LeaguePlayer } from './entities/league-player.entity';
import { LeagueMatch } from './entities/league-match.entity';
import { LeagueSubstitution } from './entities/league-substitution.entity';
import { LeagueSession } from './entities/league-session.entity';
import { FixtureService, rrStats } from './fixture.service';
import { MatchStatus, LeagueStatus, LeagueFormat } from '../common/enums';

// Helper: sort-key for a canonical player pair (order-independent)
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

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
    @InjectRepository(LeagueSubstitution) private subRepo: Repository<LeagueSubstitution>,
    @InjectRepository(LeagueSession) private sessionRepo: Repository<LeagueSession>,
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
    await this.subRepo.delete({ leagueId: id });
    await this.lmRepo.delete({ leagueId: id });
    await this.sessionRepo.delete({ leagueId: id });
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

    const matches = await this.fixtureService.generateFixtures(
      leagueId,
      playerIds,
      league.format === LeagueFormat.HOME_AWAY,
      league.mode ?? 'round',
    );

    await this.leagueRepo.update({ id: leagueId }, { status: LeagueStatus.ACTIVE });
    return { matchCount: matches.length };
  }

  // ─── Schedule stats ─────────────────────────────────────────────────────────
  // Returns all schedule metrics derived purely from player count and format.
  // Zero hardcoded values — formulas documented in fixture.service.ts.
  // ───────────────────────────────────────────────────────────────────────────
  async getScheduleStats(clubId: string, leagueId: string) {
    const league = await this.findOne(clubId, leagueId);
    const players = await this.lpRepo.find({ where: { leagueId } });
    const n = players.length;
    const homeAway = league.format === LeagueFormat.HOME_AWAY;

    const { rounds, matchesPerRound, totalMatches, hasOddPlayers } = rrStats(n, homeAway);

    const generatedCount = await this.lmRepo.count({ where: { leagueId } });
    const completedCount = await this.lmRepo.count({ where: { leagueId, status: MatchStatus.COMPLETED } });

    return {
      playerCount: n,
      isDoubleRoundRobin: homeAway,
      hasOddPlayers,
      // Expected totals (from formula, not from DB)
      expectedRounds: rounds,
      matchesPerRound,
      expectedTotalMatches: totalMatches,
      // Actual DB state
      generatedMatches: generatedCount,
      completedMatches: completedCount,
      isGenerated: generatedCount > 0,
      progressPct: totalMatches > 0 ? Math.round((completedCount / totalMatches) * 100) : 0,
    };
  }

  async getFixtures(clubId: string, leagueId: string) {
    await this.findOne(clubId, leagueId);
    return this.lmRepo.find({
      where: { leagueId },
      relations: ['homePlayer', 'awayPlayer', 'homeSubstituteFor', 'awaySubstituteFor'],
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
      throw new BadRequestException(`Maksimalan broj legova/setova je ${max}`);
    }
    if (homeSets === 0 && awaySets === 0) {
      throw new BadRequestException('Rezultat ne može biti 0:0');
    }
    // §4: draw at (max-1):(max-1), so max:(max-1) is unreachable (match ends at the draw)
    const minScore = Math.min(homeSets, awaySets);
    const maxScore = Math.max(homeSets, awaySets);
    const isDecisive = maxScore === max && minScore < max - 1;
    const isDraw = homeSets === awaySets && homeSets === max - 1;
    if (!isDecisive && !isDraw) {
      throw new BadRequestException(
        `Validan rezultat: pobeda (${max}:0 do ${max}:${max - 2}) ili remi (${max - 1}:${max - 1})`,
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

  // Total count of matches per sorted pair (all statuses — determines scheduling slots used)
  private buildPairTotalCountMap(matches: LeagueMatch[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const m of matches) {
      const key = pairKey(m.homePlayerId, m.awayPlayerId);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }

  // Find a pending (non-postponed) match for a pair that is NOT in the current evening
  private findMovablePendingMatch(
    matches: LeagueMatch[],
    id1: string,
    id2: string,
    excludeEvening: number,
  ): LeagueMatch | undefined {
    return matches.find(
      (m) =>
        m.status === MatchStatus.PENDING &&
        !m.isPostponed &&
        m.sessionNumber !== excludeEvening &&
        ((m.homePlayerId === id1 && m.awayPlayerId === id2) ||
          (m.homePlayerId === id2 && m.awayPlayerId === id1)),
    );
  }

  async previewSubstitutions(
    clubId: string,
    leagueId: string,
    eveningNumber: number,
    substitutions: { absentId: string; substituteId: string }[],
  ) {
    const league = await this.findOne(clubId, leagueId);
    const maxAllowed = league.format === LeagueFormat.HOME_AWAY ? 2 : 1;

    if (substitutions.length === 0) {
      return { willPostpone: [], willCreate: [], willMove: [], willSkip: [], warnings: [], canApply: false };
    }

    const eveningPending = await this.lmRepo.find({
      where: { leagueId, sessionNumber: eveningNumber, status: MatchStatus.PENDING, isPostponed: false },
    });

    this.validateSubstitutionInput(substitutions, eveningPending);

    const substituteMap = new Map(substitutions.map((s) => [s.absentId, s.substituteId]));
    const absentSet = new Set(substitutions.map((s) => s.absentId));

    const allMatches = await this.lmRepo.find({ where: { leagueId } });
    const pairCounts = this.buildPairTotalCountMap(allMatches);

    const willPostpone: { homePlayerId: string; awayPlayerId: string }[] = [];
    const willCreate: {
      homePlayerId: string; awayPlayerId: string;
      valid: boolean; existingCount: number; maxAllowed: number; reason?: string;
    }[] = [];
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

      const key = pairKey(newHomeId, newAwayId);
      if (handled.has(key)) continue;
      handled.add(key);

      const totalCount = pairCounts.get(key) ?? 0;
      const movable = this.findMovablePendingMatch(allMatches, newHomeId, newAwayId, eveningNumber);

      if (movable) {
        // A pending match for this pair already exists elsewhere — just reschedule it (count unchanged)
        willMove.push({ homePlayerId: movable.homePlayerId, awayPlayerId: movable.awayPlayerId, fromEvening: movable.sessionNumber });
      } else if (totalCount < maxAllowed) {
        willCreate.push({ homePlayerId: newHomeId, awayPlayerId: newAwayId, valid: true, existingCount: totalCount, maxAllowed });
      } else {
        // Pair already exhausted their allowed matches
        willSkip.push({
          homePlayerId: newHomeId,
          awayPlayerId: newAwayId,
          reason: `par već ${totalCount}/${maxAllowed} puta`,
        });
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

    // canApply: no invalid creates; at least one action will occur
    const canApply =
      willCreate.every((m) => m.valid) &&
      (willCreate.length > 0 || willMove.length > 0);

    return { willPostpone, willCreate, willMove, willSkip, warnings, canApply };
  }

  async applySubstitutions(
    clubId: string,
    leagueId: string,
    eveningNumber: number,
    substitutions: { absentId: string; substituteId: string }[],
  ) {
    const league = await this.findOne(clubId, leagueId);
    const maxAllowed = league.format === LeagueFormat.HOME_AWAY ? 2 : 1;

    const eveningPending = await this.lmRepo.find({
      where: { leagueId, sessionNumber: eveningNumber, status: MatchStatus.PENDING, isPostponed: false },
    });

    this.validateSubstitutionInput(substitutions, eveningPending);

    const substituteMap = new Map(substitutions.map((s) => [s.absentId, s.substituteId]));
    const absentSet = new Set(substitutions.map((s) => s.absentId));

    const allMatches = await this.lmRepo.find({ where: { leagueId } });
    const pairCounts = this.buildPairTotalCountMap(allMatches);

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

      // Postpone the original match — the absent player still owes this game
      await this.lmRepo.update(match.id, { isPostponed: true });
      postponed++;

      const newHomeId = homeIsAbsent ? substituteMap.get(match.homePlayerId)! : match.homePlayerId;
      const newAwayId = awayIsAbsent ? substituteMap.get(match.awayPlayerId)! : match.awayPlayerId;
      if (newHomeId === newAwayId) continue;

      const key = pairKey(newHomeId, newAwayId);
      if (handled.has(key)) continue;
      handled.add(key);

      const totalCount = pairCounts.get(key) ?? 0;
      const movable = this.findMovablePendingMatch(allMatches, newHomeId, newAwayId, eveningNumber);

      if (movable) {
        // Reschedule the existing pending match to this evening
        await this.lmRepo.update(movable.id, {
          sessionNumber: eveningNumber,
          roundNumber: eveningNumber,
          matchOrder: nextOrder++,
          isPostponed: false,
        });
        moved++;
      } else if (totalCount < maxAllowed) {
        // Create a new substitution match with markers
        const newMatch = this.lmRepo.create({
          leagueId,
          homePlayerId: newHomeId,
          awayPlayerId: newAwayId,
          homeSubstituteForId: homeIsAbsent ? match.homePlayerId : null,
          awaySubstituteForId: awayIsAbsent ? match.awayPlayerId : null,
          isSubstitutionMatch: true,
          roundNumber: eveningNumber,
          sessionNumber: eveningNumber,
          matchOrder: nextOrder++,
          status: MatchStatus.PENDING,
          isPostponed: false,
        });
        await this.lmRepo.save(newMatch);
        pairCounts.set(key, totalCount + 1);
        created++;
      } else {
        skipped++;
      }
    }

    // Record substitution history (for UI display only — does NOT touch future matches)
    for (const sub of substitutions) {
      await this.subRepo.save(
        this.subRepo.create({
          leagueId,
          absentPlayerId: sub.absentId,
          substitutePlayerId: sub.substituteId,
          appliedFromEvening: eveningNumber,
        }),
      );
    }

    return { postponed, created, moved, skipped };
  }

  async getSubstitutions(clubId: string, leagueId: string) {
    await this.findOne(clubId, leagueId);
    return this.subRepo.find({
      where: { leagueId },
      relations: ['absentPlayer', 'substitutePlayer'],
      order: { appliedFromEvening: 'ASC', createdAt: 'ASC' },
    });
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

    // §6 tiebreaker 4: head-to-head points map — "A vs B" key → A's H2H points against B
    const h2hPoints = new Map<string, number>();

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

      // Directional H2H keys: "homeId→awayId" and "awayId→homeId"
      const hKey = `${m.homePlayerId}→${m.awayPlayerId}`;
      const aKey = `${m.awayPlayerId}→${m.homePlayerId}`;

      if (m.winnerId === m.homePlayerId) {
        home.won++;
        home.points += league.pointsWin;
        away.lost++;
        away.points += league.pointsLoss;
        h2hPoints.set(hKey, (h2hPoints.get(hKey) ?? 0) + league.pointsWin);
        h2hPoints.set(aKey, (h2hPoints.get(aKey) ?? 0) + league.pointsLoss);
      } else if (m.winnerId === m.awayPlayerId) {
        away.won++;
        away.points += league.pointsWin;
        home.lost++;
        home.points += league.pointsLoss;
        h2hPoints.set(hKey, (h2hPoints.get(hKey) ?? 0) + league.pointsLoss);
        h2hPoints.set(aKey, (h2hPoints.get(aKey) ?? 0) + league.pointsWin);
      } else {
        home.drawn++;
        away.drawn++;
        home.points += league.pointsDraw;
        away.points += league.pointsDraw;
        h2hPoints.set(hKey, (h2hPoints.get(hKey) ?? 0) + league.pointsDraw);
        h2hPoints.set(aKey, (h2hPoints.get(aKey) ?? 0) + league.pointsDraw);
      }
    }

    const getH2H = (aId: string, bId: string) => h2hPoints.get(`${aId}→${bId}`) ?? 0;

    return Array.from(statsMap.values())
      .sort((a, b) => {
        // §6 criterion 1: points
        if (b.points !== a.points) return b.points - a.points;
        // §6 criterion 2: leg difference (sets are legs when setsPerMatch=1)
        const aLegDiff = a.setsFor - a.setsAgainst;
        const bLegDiff = b.setsFor - b.setsAgainst;
        if (bLegDiff !== aLegDiff) return bLegDiff - aLegDiff;
        // §6 criterion 3: more legs won
        if (b.setsFor !== a.setsFor) return b.setsFor - a.setsFor;
        // §6 criterion 4: head-to-head score
        const aH2H = getH2H(a.player?.id, b.player?.id);
        const bH2H = getH2H(b.player?.id, a.player?.id);
        if (bH2H !== aH2H) return bH2H - aH2H;
        // §6 criterion 5: additional match — manual, not resolvable in code
        return 0;
      })
      .map((s, i) => ({ position: i + 1, ...s, postponed: postponedCount.get(s.player?.id) ?? 0 }));
  }

  /**
   * §8 — Records a walkover: the absent player forfeits 4:0.
   * walkoverId = the player who was absent (the LOSER).
   */
  async recordWalkover(
    clubId: string,
    leagueId: string,
    matchId: string,
    walkoverId: string,
  ) {
    const league = await this.findOne(clubId, leagueId);
    const match = await this.lmRepo.findOne({ where: { id: matchId, leagueId } });
    if (!match) throw new NotFoundException('Meč nije pronađen');
    if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.WALKOVER) {
      throw new BadRequestException('Meč je već završen');
    }
    if (walkoverId !== match.homePlayerId && walkoverId !== match.awayPlayerId) {
      throw new BadRequestException('Igrač nije učesnik ovog meča');
    }

    const legsToWin = league.setsPerMatch === 1 ? league.legsPerSet : league.setsPerMatch;
    const homeIsAbsent = walkoverId === match.homePlayerId;
    const homeSets = homeIsAbsent ? 0 : legsToWin;
    const awaySets = homeIsAbsent ? legsToWin : 0;
    const winnerId = homeIsAbsent ? match.awayPlayerId : match.homePlayerId;

    await this.lmRepo.update(matchId, {
      homeSets,
      awaySets,
      winnerId,
      status: MatchStatus.COMPLETED,
      isWalkover: true,
      playedAt: new Date(),
      isPostponed: false,
    });

    return this.lmRepo.findOne({ where: { id: matchId }, relations: ['homePlayer', 'awayPlayer'] });
  }
}
