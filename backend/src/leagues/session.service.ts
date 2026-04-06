import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { LeagueSession } from './entities/league-session.entity';
import { LeagueMatch } from './entities/league-match.entity';
import { League } from './entities/league.entity';
import { MatchStatus } from '../common/enums';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(LeagueSession) private sessionRepo: Repository<LeagueSession>,
    @InjectRepository(LeagueMatch)   private matchRepo:   Repository<LeagueMatch>,
    @InjectRepository(League)        private leagueRepo:  Repository<League>,
  ) {}

  // ─── Auth helper ─────────────────────────────────────────────────────────────
  private async verifyLeague(clubId: string, leagueId: string): Promise<League> {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId, clubId } });
    if (!league) throw new NotFoundException('Liga nije pronađena');
    return league;
  }

  // ─── Smart pairing algorithm ─────────────────────────────────────────────────
  //
  // Multi-pass round-by-round scheduler with minimum-degree heuristic:
  //
  //   1. Filter candidates — only matches where BOTH players are present
  //   2. Run maxPerPlayer passes. In each pass:
  //      a. Build the available match pool for this pass (unused, unblocked, under cap)
  //      b. Compute each player's "degree" — how many available matches they have
  //      c. Sort by min(degree[home], degree[away]) ASC so the most constrained
  //         players get paired first, reducing leftover players at end of pass
  //      d. Greedy selection: schedule match if both players are free this pass
  //
  // This heuristic significantly reduces uneven match counts caused by the naive
  // matchOrder-first greedy when pool has partial rounds (e.g. 25 players where
  // one always sits out per round).
  //
  // Complexity: O(maxPerPlayer × candidates²) — negligible for typical league sizes.
  // Guarantees: no player > maxPerPlayer matches; same directional pair never
  //             scheduled twice; approaches floor(N × maxPerPlayer / 2) matches.
  // ─────────────────────────────────────────────────────────────────────────────
  private selectMatches(
    pool: LeagueMatch[],
    presentIds: string[],
    maxPerPlayer: number,
  ): LeagueMatch[] {
    const presentSet = new Set(presentIds);

    const candidates = pool
      .filter((m) => m.homePlayerId && m.awayPlayerId && presentSet.has(m.homePlayerId) && presentSet.has(m.awayPlayerId))
      .sort((a, b) => a.matchOrder - b.matchOrder);

    const playerCount    = new Map<string, number>();
    const scheduledPairs = new Set<string>(); // prevents same directional pair twice in one session
    const usedMatchIds   = new Set<string>(); // matches already selected
    const selected: LeagueMatch[] = [];

    for (let pass = 0; pass < maxPerPlayer; pass++) {
      const busyThisPass = new Set<string>();

      // Build available pool for this pass
      const passPool = candidates.filter((m) => {
        if (usedMatchIds.has(m.id)) return false;
        if (scheduledPairs.has(`${m.homePlayerId}|${m.awayPlayerId}`)) return false;
        const hc = playerCount.get(m.homePlayerId!) ?? 0;
        const ac = playerCount.get(m.awayPlayerId!) ?? 0;
        return hc < maxPerPlayer && ac < maxPerPlayer;
      });

      // Degree = number of available matches each player has this pass
      const degree = new Map<string, number>();
      for (const m of passPool) {
        degree.set(m.homePlayerId!, (degree.get(m.homePlayerId!) ?? 0) + 1);
        degree.set(m.awayPlayerId!, (degree.get(m.awayPlayerId!) ?? 0) + 1);
      }

      // Sort: most constrained players first; matchOrder as tiebreaker
      const sortedPass = [...passPool].sort((a, b) => {
        const minA = Math.min(degree.get(a.homePlayerId!) ?? 0, degree.get(a.awayPlayerId!) ?? 0);
        const minB = Math.min(degree.get(b.homePlayerId!) ?? 0, degree.get(b.awayPlayerId!) ?? 0);
        return minA !== minB ? minA - minB : a.matchOrder - b.matchOrder;
      });

      for (const match of sortedPass) {
        if (busyThisPass.has(match.homePlayerId!) || busyThisPass.has(match.awayPlayerId!)) continue;

        const hc = playerCount.get(match.homePlayerId!) ?? 0;
        const ac = playerCount.get(match.awayPlayerId!) ?? 0;
        if (hc < maxPerPlayer && ac < maxPerPlayer) {
          selected.push(match);
          usedMatchIds.add(match.id);
          playerCount.set(match.homePlayerId!, hc + 1);
          playerCount.set(match.awayPlayerId!, ac + 1);
          scheduledPairs.add(`${match.homePlayerId}|${match.awayPlayerId}`);
          busyThisPass.add(match.homePlayerId!);
          busyThisPass.add(match.awayPlayerId!);
        }
      }
    }

    return selected;
  }

  // ─── Pool ─────────────────────────────────────────────────────────────────────
  // Unassigned + pending matches available for future sessions.
  // For euroleague leagues the pool is scoped to the active phase.
  private async getPool(leagueId: string, phaseId?: string | null): Promise<LeagueMatch[]> {
    const where: any = { leagueId, sessionId: IsNull(), status: MatchStatus.PENDING };
    if (phaseId) where.phaseId = phaseId;
    return this.matchRepo.find({ where, order: { matchOrder: 'ASC' } });
  }

  // Returns the activePhaseId for euroleague leagues, null otherwise.
  private activePhaseId(league: League): string | null {
    return league.mode === 'euroleague' ? league.activePhaseId : null;
  }

  // ─── Preview (no side effects) ───────────────────────────────────────────────
  async previewSession(
    clubId: string,
    leagueId: string,
    presentPlayerIds: string[],
    maxMatchesPerPlayer = 1,
  ) {
    const league = await this.verifyLeague(clubId, leagueId);

    if (presentPlayerIds.length < 2) {
      return { matches: [], presentCount: presentPlayerIds.length, matchCount: 0, poolSize: 0 };
    }

    const pool = await this.getPool(leagueId, this.activePhaseId(league));
    const selected = this.selectMatches(pool, presentPlayerIds, maxMatchesPerPlayer);

    const matchesWithPlayers = await Promise.all(
      selected.map((m) =>
        this.matchRepo.findOne({
          where: { id: m.id },
          relations: ['homePlayer', 'awayPlayer'],
        }),
      ),
    );

    return {
      matches: matchesWithPlayers.filter(Boolean),
      presentCount: presentPlayerIds.length,
      matchCount: selected.length,
      poolSize: pool.length,
    };
  }

  // ─── Create session ───────────────────────────────────────────────────────────
  async createSession(
    clubId: string,
    leagueId: string,
    body: {
      presentPlayerIds: string[];
      maxMatchesPerPlayer?: number;
      sessionDate?: string | null;
    },
  ) {
    const league = await this.verifyLeague(clubId, leagueId);

    const { presentPlayerIds, maxMatchesPerPlayer = 1, sessionDate = null } = body;
    const phaseId = this.activePhaseId(league);

    if (presentPlayerIds.length < 2) {
      throw new BadRequestException('Potrebna su najmanje 2 prisutna igrača');
    }

    const pool = await this.getPool(leagueId, phaseId);
    const selected = this.selectMatches(pool, presentPlayerIds, maxMatchesPerPlayer);

    if (selected.length === 0) {
      throw new BadRequestException(
        'Nema dostupnih mečeva za izabrane igrače — svi mečevi su već odigrani ili dodeljeni drugoj sesiji',
      );
    }

    // Next session number (per league)
    const last = await this.sessionRepo.findOne({
      where: { leagueId },
      order: { sessionNumber: 'DESC' },
    });
    const sessionNumber = (last?.sessionNumber ?? 0) + 1;

    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        leagueId,
        phaseId,
        sessionNumber,
        sessionDate,
        status: 'open',
        presentPlayerIds,
        maxMatchesPerPlayer,
      }),
    );

    // Assign selected matches to this session
    await Promise.all(
      selected.map((m) =>
        this.matchRepo.update(m.id, {
          sessionId: session.id,
          sessionNumber,
          roundNumber: sessionNumber,
        }),
      ),
    );

    return this.getSession(clubId, leagueId, session.id);
  }

  // ─── List sessions ────────────────────────────────────────────────────────────
  async getSessions(clubId: string, leagueId: string, phaseIdOverride?: string) {
    const league = await this.verifyLeague(clubId, leagueId);

    // Caller may specify an explicit phaseId (e.g. when viewing a completed phase).
    // Otherwise fall back to the league's active phase (for euroleague) or no filter.
    const phaseId = phaseIdOverride ?? this.activePhaseId(league);

    const where: any = { leagueId };
    if (phaseId) where.phaseId = phaseId;

    const sessions = await this.sessionRepo.find({
      where,
      order: { sessionNumber: 'ASC' },
    });

    return Promise.all(
      sessions.map(async (s) => {
        const [matchCount, completedCount] = await Promise.all([
          this.matchRepo.count({ where: { sessionId: s.id } }),
          this.matchRepo.count({ where: { sessionId: s.id, status: MatchStatus.COMPLETED } }),
        ]);
        return { ...s, matchCount, completedCount };
      }),
    );
  }

  // ─── Single session with matches ──────────────────────────────────────────────
  async getSession(clubId: string, leagueId: string, sessionId: string) {
    await this.verifyLeague(clubId, leagueId);

    const session = await this.sessionRepo.findOne({ where: { id: sessionId, leagueId } });
    if (!session) throw new NotFoundException('Sesija nije pronađena');

    const matches = await this.matchRepo.find({
      where: { sessionId, leagueId },
      relations: ['homePlayer', 'awayPlayer'],
      order: { matchOrder: 'ASC' },
    });

    return { ...session, matches };
  }

  // ─── Close session ────────────────────────────────────────────────────────────
  // Returns any unplayed matches back to the pool (sessionId = null, sessionNumber = 0).
  // Played matches stay linked to the session for historical display.
  async closeSession(clubId: string, leagueId: string, sessionId: string) {
    await this.verifyLeague(clubId, leagueId);

    const session = await this.sessionRepo.findOne({ where: { id: sessionId, leagueId } });
    if (!session) throw new NotFoundException('Sesija nije pronađena');
    if (session.status === 'closed') throw new BadRequestException('Sesija je već zatvorena');

    // Find unplayed matches in this session
    const unplayed = await this.matchRepo.find({
      where: { sessionId, leagueId, status: MatchStatus.PENDING },
    });

    // Return them to pool
    if (unplayed.length > 0) {
      await Promise.all(
        unplayed.map((m) =>
          this.matchRepo.update(m.id, {
            sessionId: null,
            sessionNumber: 0,
            roundNumber: 0,
          }),
        ),
      );
    }

    await this.sessionRepo.update(sessionId, { status: 'closed' });
    return this.getSession(clubId, leagueId, sessionId);
  }

  // ─── Delete session ───────────────────────────────────────────────────────────
  // Completed matches keep their sessionId for historical record.
  // Unplayed matches are returned to pool, then session row is deleted.
  async deleteSession(clubId: string, leagueId: string, sessionId: string) {
    await this.verifyLeague(clubId, leagueId);

    const session = await this.sessionRepo.findOne({ where: { id: sessionId, leagueId } });
    if (!session) throw new NotFoundException('Sesija nije pronađena');

    // Return ALL matches (played and unplayed) back to pool as pending
    await this.matchRepo.update(
      { sessionId, leagueId },
      {
        sessionId: null,
        sessionNumber: 0,
        roundNumber: 0,
        status: MatchStatus.PENDING,
        homeSets: 0,
        awaySets: 0,
        winnerId: null,
        isWalkover: false,
      },
    );

    await this.sessionRepo.delete(sessionId);
    return { deleted: true };
  }

  // ─── Manual match: check validity ────────────────────────────────────────────
  async checkManualMatch(
    clubId: string,
    leagueId: string,
    sessionId: string,
    homePlayerId: string,
    awayPlayerId: string,
  ) {
    await this.verifyLeague(clubId, leagueId);

    if (!homePlayerId || !awayPlayerId || homePlayerId === awayPlayerId) {
      return { canAdd: false, totalCount: 0, playedCount: 0, matchNumber: 0, isFromPool: false, status: 'invalid' };
    }

    // Count all existing matches between this pair (either direction)
    const [c1, c2] = await Promise.all([
      this.matchRepo.count({ where: { leagueId, homePlayerId, awayPlayerId } }),
      this.matchRepo.count({ where: { leagueId, homePlayerId: awayPlayerId, awayPlayerId: homePlayerId } }),
    ]);
    const totalCount = c1 + c2;

    // Count completed matches between them
    const [p1, p2] = await Promise.all([
      this.matchRepo.count({ where: { leagueId, homePlayerId, awayPlayerId, status: MatchStatus.COMPLETED } }),
      this.matchRepo.count({ where: { leagueId, homePlayerId: awayPlayerId, awayPlayerId: homePlayerId, status: MatchStatus.COMPLETED } }),
    ]);
    const playedCount = p1 + p2;

    // Check if a pool match exists for this pair (unassigned, pending)
    const poolMatch = await this.matchRepo.findOne({
      where: [
        { leagueId, homePlayerId, awayPlayerId, sessionId: IsNull(), status: MatchStatus.PENDING },
        { leagueId, homePlayerId: awayPlayerId, awayPlayerId: homePlayerId, sessionId: IsNull(), status: MatchStatus.PENDING },
      ],
    });
    const isFromPool = !!poolMatch;

    // Can add if: pool match exists OR total < 2
    const canAdd = isFromPool || totalCount < 2;
    const matchNumber = totalCount + (isFromPool ? 0 : 1); // pool match replaces existing count

    let status: string;
    if (!canAdd) status = 'blocked';
    else if (isFromPool && totalCount >= 1) status = 'second';
    else if (totalCount === 1) status = 'second';
    else status = 'first';

    return { canAdd, totalCount, playedCount, matchNumber: isFromPool ? totalCount : totalCount + 1, isFromPool, status };
  }

  // ─── Manual match: add to session ────────────────────────────────────────────
  async addManualMatch(
    clubId: string,
    leagueId: string,
    sessionId: string,
    homePlayerId: string,
    awayPlayerId: string,
  ) {
    await this.verifyLeague(clubId, leagueId);

    const session = await this.sessionRepo.findOne({ where: { id: sessionId, leagueId } });
    if (!session) throw new NotFoundException('Sesija nije pronađena');
    if (session.status === 'closed') throw new BadRequestException('Sesija je zatvorena');
    if (homePlayerId === awayPlayerId) throw new BadRequestException('Igrači moraju biti različiti');

    // Try to find an existing pool match for this pair
    const poolMatch = await this.matchRepo.findOne({
      where: [
        { leagueId, homePlayerId, awayPlayerId, sessionId: IsNull(), status: MatchStatus.PENDING },
        { leagueId, homePlayerId: awayPlayerId, awayPlayerId: homePlayerId, sessionId: IsNull(), status: MatchStatus.PENDING },
      ],
      relations: ['homePlayer', 'awayPlayer'],
    });

    if (poolMatch) {
      // Pull it from pool into this session
      await this.matchRepo.update(poolMatch.id, {
        sessionId,
        sessionNumber: session.sessionNumber,
        roundNumber:   session.sessionNumber,
      });
      return this.matchRepo.findOne({ where: { id: poolMatch.id }, relations: ['homePlayer', 'awayPlayer'] });
    }

    // No pool match — validate pair limit
    const [c1, c2] = await Promise.all([
      this.matchRepo.count({ where: { leagueId, homePlayerId, awayPlayerId } }),
      this.matchRepo.count({ where: { leagueId, homePlayerId: awayPlayerId, awayPlayerId: homePlayerId } }),
    ]);
    if (c1 + c2 >= 2) {
      throw new BadRequestException('Ovi igrači su već odigrali oba predviđena meča u ligi');
    }

    // Determine home/away for 2nd match (enforce reversal)
    let finalHomeId = homePlayerId;
    let finalAwayId = awayPlayerId;
    if (c1 + c2 === 1) {
      const existing = await this.matchRepo.findOne({
        where: [
          { leagueId, homePlayerId, awayPlayerId },
          { leagueId, homePlayerId: awayPlayerId, awayPlayerId: homePlayerId },
        ],
      });
      if (existing) {
        finalHomeId = existing.awayPlayerId!;
        finalAwayId = existing.homePlayerId!;
      }
    }

    // Place after all existing matches (matchOrder)
    const lastMatch = await this.matchRepo.findOne({
      where: { leagueId },
      order: { matchOrder: 'DESC' },
    });
    const matchOrder = (lastMatch?.matchOrder ?? 0) + 1;

    const created = await this.matchRepo.save(
      this.matchRepo.create({
        leagueId,
        homePlayerId: finalHomeId,
        awayPlayerId: finalAwayId,
        sessionId,
        sessionNumber: session.sessionNumber,
        roundNumber:   session.sessionNumber,
        matchOrder,
        status: MatchStatus.PENDING,
        homeSets: 0,
        awaySets: 0,
      }),
    );

    return this.matchRepo.findOne({ where: { id: created.id }, relations: ['homePlayer', 'awayPlayer'] });
  }

  // ─── Pool info ────────────────────────────────────────────────────────────────
  async getPoolInfo(clubId: string, leagueId: string) {
    const league = await this.verifyLeague(clubId, leagueId);
    const phaseId = this.activePhaseId(league);

    const phaseFilter: any = phaseId ? { phaseId } : {};

    const [poolSize, completedCount, totalCount] = await Promise.all([
      this.matchRepo.count({ where: { leagueId, sessionId: IsNull(), status: MatchStatus.PENDING, ...phaseFilter } }),
      this.matchRepo.count({ where: { leagueId, status: MatchStatus.COMPLETED, ...phaseFilter } }),
      this.matchRepo.count({ where: { leagueId, ...phaseFilter } }),
    ]);

    return {
      poolSize,
      completedCount,
      totalCount,
      progressPct: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  }
}
