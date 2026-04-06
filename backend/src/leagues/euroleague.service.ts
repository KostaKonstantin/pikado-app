import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompetitionPhase } from './entities/competition-phase.entity';
import { LeagueMatch } from './entities/league-match.entity';
import { LeaguePlayer } from './entities/league-player.entity';
import { League } from './entities/league.entity';
import { MatchStatus, LeagueStatus } from '../common/enums';
import { FixtureService } from './fixture.service';

// Phase order constants
const PHASE_REGULAR  = 1;
const PHASE_BARAZ    = 2;
const PHASE_TOP10    = 3;
const PHASE_PLAYOFF  = 4;

@Injectable()
export class EuroleagueService {
  constructor(
    @InjectRepository(CompetitionPhase) private phaseRepo: Repository<CompetitionPhase>,
    @InjectRepository(LeagueMatch)      private matchRepo: Repository<LeagueMatch>,
    @InjectRepository(LeaguePlayer)     private lpRepo:    Repository<LeaguePlayer>,
    @InjectRepository(League)           private leagueRepo: Repository<League>,
    private readonly fixtureService: FixtureService,
  ) {}

  // ─── Auth / guard ─────────────────────────────────────────────────────────────
  private async verifyLeague(clubId: string, leagueId: string): Promise<League> {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId, clubId } });
    if (!league) throw new NotFoundException('Liga nije pronađena');
    if (league.mode !== 'euroleague') throw new BadRequestException('Liga nije EvroLiga tip');
    return league;
  }

  // ─── Phase CRUD ───────────────────────────────────────────────────────────────

  async getPhases(clubId: string, leagueId: string) {
    await this.verifyLeague(clubId, leagueId);
    return this.phaseRepo.find({ where: { leagueId }, order: { phaseOrder: 'ASC' } });
  }

  async getPhase(clubId: string, leagueId: string, phaseId: string) {
    await this.verifyLeague(clubId, leagueId);
    const phase = await this.phaseRepo.findOne({ where: { id: phaseId, leagueId } });
    if (!phase) throw new NotFoundException('Faza nije pronađena');
    return phase;
  }

  // ─── Initialize phases (called on first "generate") ──────────────────────────
  async initPhases(clubId: string, leagueId: string) {
    await this.verifyLeague(clubId, leagueId);

    // Wipe any previously created phases + their matches
    const existing = await this.phaseRepo.find({ where: { leagueId } });
    if (existing.length > 0) {
      await Promise.all(existing.map(p => this.matchRepo.delete({ leagueId, phaseId: p.id })));
      await this.phaseRepo.delete({ leagueId });
    }

    const defs = [
      { name: 'Regularni deo', type: 'round_robin' as const, phaseOrder: PHASE_REGULAR  },
      { name: 'Baraž',         type: 'round_robin' as const, phaseOrder: PHASE_BARAZ   },
      { name: 'Top 10',        type: 'round_robin' as const, phaseOrder: PHASE_TOP10   },
      { name: 'Playoff',       type: 'knockout'    as const, phaseOrder: PHASE_PLAYOFF },
    ];

    const phases = await Promise.all(
      defs.map(d =>
        this.phaseRepo.save(this.phaseRepo.create({
          leagueId, name: d.name, type: d.type, phaseOrder: d.phaseOrder,
          status: 'pending', playerIds: [],
        }))
      )
    );

    // Start regular phase immediately
    await this.startRegularPhase(clubId, leagueId, phases[0]);

    return this.getPhases(clubId, leagueId);
  }

  // ─── Start regular phase ──────────────────────────────────────────────────────
  private async startRegularPhase(
    clubId: string,
    leagueId: string,
    regularPhase: CompetitionPhase,
  ) {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId } });
    const lPlayers = await this.lpRepo.find({ where: { leagueId } });
    if (lPlayers.length < 2) throw new BadRequestException('Potrebna su najmanje 2 igrača');

    const playerIds = lPlayers.map(lp => lp.playerId);

    // Use FixtureService to build + save round-robin matches for this phase
    const created = await this.fixtureService.generateFixtures(leagueId, playerIds, true, 'round');

    // Tag all created matches with the phase
    await Promise.all(created.map(m => this.matchRepo.update(m.id, { phaseId: regularPhase.id })));

    await this.phaseRepo.update(regularPhase.id, { status: 'active', playerIds });
    await this.leagueRepo.update(leagueId, {
      status: LeagueStatus.ACTIVE,
      activePhaseId: regularPhase.id,
    });
  }

  // ─── Phase fixtures & standings ───────────────────────────────────────────────

  async getPhaseFixtures(clubId: string, leagueId: string, phaseId: string) {
    await this.verifyLeague(clubId, leagueId);
    return this.matchRepo.find({
      where: { leagueId, phaseId },
      relations: ['homePlayer', 'awayPlayer'],
      order: { matchOrder: 'ASC' },
    });
  }

  async getPhaseStandings(clubId: string, leagueId: string, phaseId: string) {
    const league = await this.verifyLeague(clubId, leagueId);
    const phase  = await this.phaseRepo.findOne({ where: { id: phaseId, leagueId } });
    if (!phase) throw new NotFoundException('Faza nije pronađena');

    const phasePlayerIds = new Set(phase.playerIds);
    const allLp = await this.lpRepo.find({ where: { leagueId }, relations: ['player'] });
    const phaseLp = allLp.filter(lp => phasePlayerIds.has(lp.playerId));

    const matches = await this.matchRepo.find({
      where: { leagueId, phaseId, status: MatchStatus.COMPLETED },
    });

    const map = new Map<string, any>();
    for (const lp of phaseLp) {
      map.set(lp.playerId, {
        playerId: lp.playerId, player: lp.player,
        played: 0, wins: 0, draws: 0, losses: 0, points: 0,
        setsFor: 0, setsAgainst: 0, legsFor: 0, legsAgainst: 0,
      });
    }

    for (const m of matches) {
      const home = map.get(m.homePlayerId!);
      const away = map.get(m.awayPlayerId!);
      if (!home || !away) continue;

      home.played++; away.played++;
      home.setsFor += m.homeSets; home.setsAgainst += m.awaySets;
      away.setsFor += m.awaySets; away.setsAgainst += m.homeSets;
      home.legsFor += m.homeLegs; home.legsAgainst += m.awayLegs;
      away.legsFor += m.awayLegs; away.legsAgainst += m.homeLegs;

      if (m.winnerId === m.homePlayerId) {
        home.wins++; away.losses++;
        home.points += league.pointsWin; away.points += league.pointsLoss;
      } else if (m.winnerId === m.awayPlayerId) {
        away.wins++; home.losses++;
        away.points += league.pointsWin; home.points += league.pointsLoss;
      } else {
        home.draws++; away.draws++;
        home.points += league.pointsDraw; away.points += league.pointsDraw;
      }
    }

    const sorted = [...map.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const da = a.setsFor - a.setsAgainst;
      const db = b.setsFor - b.setsAgainst;
      if (db !== da) return db - da;
      return b.setsFor - a.setsFor;
    });

    return sorted.map((s, i) => ({ ...s, position: i + 1 }));
  }

  // ─── Update match result (works for both round-robin and knockout) ────────────
  async updatePhaseMatch(
    clubId: string,
    leagueId: string,
    phaseId: string,
    matchId: string,
    homeSets: number,
    awaySets: number,
  ) {
    const league = await this.verifyLeague(clubId, leagueId);
    const phase  = await this.phaseRepo.findOne({ where: { id: phaseId, leagueId } });
    if (!phase) throw new NotFoundException('Faza nije pronađena');

    const match = await this.matchRepo.findOne({ where: { id: matchId, leagueId, phaseId } });
    if (!match) throw new NotFoundException('Meč nije pronađen');

    let winnerId: string | null = null;
    let status = MatchStatus.COMPLETED;

    if (phase.type === 'knockout') {
      // Playoff format: first to 2 sets wins (best of 3 — possible scores: 2:0, 2:1)
      const PLAYOFF_SETS_TO_WIN = 2;
      if (homeSets >= PLAYOFF_SETS_TO_WIN)      winnerId = match.homePlayerId;
      else if (awaySets >= PLAYOFF_SETS_TO_WIN) winnerId = match.awayPlayerId;
      else                                       status   = MatchStatus.IN_PROGRESS;
    } else {
      // Round-robin: direct set comparison (draw possible)
      if (homeSets > awaySets)      winnerId = match.homePlayerId;
      else if (awaySets > homeSets) winnerId = match.awayPlayerId;
      // else draw → winnerId stays null
    }

    await this.matchRepo.update(matchId, { homeSets, awaySets, winnerId, status, playedAt: new Date() });

    // Auto-advance playoff winner to Final
    if (phase.type === 'knockout' && status === MatchStatus.COMPLETED && winnerId) {
      await this.advancePlayoffWinner(leagueId, phaseId, match, winnerId);
    }

    return this.matchRepo.findOne({ where: { id: matchId }, relations: ['homePlayer', 'awayPlayer'] });
  }

  private async advancePlayoffWinner(
    leagueId: string,
    phaseId: string,
    completedMatch: LeagueMatch,
    winnerId: string,
  ) {
    if (!completedMatch.phaseMatchType?.startsWith('semifinal')) return;

    const loserId =
      completedMatch.homePlayerId === winnerId
        ? completedMatch.awayPlayerId
        : completedMatch.homePlayerId;

    // Advance winner → Final; loser → Third-place match
    // SF1 (matchOrder=0) → home slot; SF2 (matchOrder=1) → away slot
    const [finalMatch, thirdPlaceMatch] = await Promise.all([
      this.matchRepo.findOne({ where: { leagueId, phaseId, phaseMatchType: 'final' } }),
      this.matchRepo.findOne({ where: { leagueId, phaseId, phaseMatchType: 'third_place' } }),
    ]);

    if (finalMatch) {
      if (completedMatch.matchOrder === 0) {
        await this.matchRepo.update(finalMatch.id, { homePlayerId: winnerId });
      } else {
        await this.matchRepo.update(finalMatch.id, { awayPlayerId: winnerId });
      }
    }

    if (thirdPlaceMatch) {
      if (completedMatch.matchOrder === 0) {
        await this.matchRepo.update(thirdPlaceMatch.id, { homePlayerId: loserId });
      } else {
        await this.matchRepo.update(thirdPlaceMatch.id, { awayPlayerId: loserId });
      }
    }
  }

  // ─── Advance to next phase ────────────────────────────────────────────────────
  async advanceToNextPhase(clubId: string, leagueId: string) {
    await this.verifyLeague(clubId, leagueId);
    const phases = await this.phaseRepo.find({ where: { leagueId }, order: { phaseOrder: 'ASC' } });

    const activePhase = phases.find(p => p.status === 'active');
    if (!activePhase) throw new BadRequestException('Nema aktivne faze');

    const nextPhase = phases.find(p => p.phaseOrder === activePhase.phaseOrder + 1);
    if (!nextPhase) throw new BadRequestException('Nema sledeće faze');

    // Complete current phase
    await this.phaseRepo.update(activePhase.id, { status: 'completed' });

    // Compute standings of the phase that just ended
    const currentStandings = await this.getPhaseStandings(clubId, leagueId, activePhase.id);

    let nextPlayerIds: string[] = [];

    if (nextPhase.phaseOrder === PHASE_BARAZ) {
      // Players 9–20 by Regular standings
      nextPlayerIds = currentStandings.slice(8, 20).map(s => s.playerId);

    } else if (nextPhase.phaseOrder === PHASE_TOP10) {
      // Top 8 from Regular + Top 2 from Baraž
      const regularPhase = phases.find(p => p.phaseOrder === PHASE_REGULAR);
      if (!regularPhase) throw new BadRequestException('Regularni deo nije pronađen');
      const regularStandings = await this.getPhaseStandings(clubId, leagueId, regularPhase.id);
      const top8   = regularStandings.slice(0, 8).map(s => s.playerId);
      const top2   = currentStandings.slice(0, 2).map(s => s.playerId);
      nextPlayerIds = [...top8, ...top2];

    } else if (nextPhase.phaseOrder === PHASE_PLAYOFF) {
      // Top 4 from Top 10
      nextPlayerIds = currentStandings.slice(0, 4).map(s => s.playerId);
    }

    if (nextPlayerIds.length < 2) {
      throw new BadRequestException('Nedovoljno igrača za sledeću fazu');
    }

    if (nextPhase.type === 'round_robin') {
      // Baraž and Top 10 use Home/Away (double round-robin): each pair plays twice
      const created = await this.fixtureService.generateFixtures(leagueId, nextPlayerIds, true, 'round');
      await Promise.all(created.map(m => this.matchRepo.update(m.id, { phaseId: nextPhase.id })));

    } else {
      // Knockout: SF1 (1st vs 4th), SF2 (2nd vs 3rd), Final (TBD)
      const [p1, p2, p3, p4] = nextPlayerIds;

      await this.matchRepo.save(this.matchRepo.create({
        leagueId, phaseId: nextPhase.id,
        homePlayerId: p1, awayPlayerId: p4,
        roundNumber: 1, sessionNumber: 1, matchOrder: 0,
        status: MatchStatus.PENDING, homeSets: 0, awaySets: 0, homeLegs: 0, awayLegs: 0,
        phaseMatchType: 'semifinal_1',
      }));

      await this.matchRepo.save(this.matchRepo.create({
        leagueId, phaseId: nextPhase.id,
        homePlayerId: p2, awayPlayerId: p3,
        roundNumber: 1, sessionNumber: 1, matchOrder: 1,
        status: MatchStatus.PENDING, homeSets: 0, awaySets: 0, homeLegs: 0, awayLegs: 0,
        phaseMatchType: 'semifinal_2',
      }));

      // Final: placeholder players filled after SFs complete (null = TBD)
      await this.matchRepo.save(this.matchRepo.create({
        leagueId, phaseId: nextPhase.id,
        homePlayerId: null, awayPlayerId: null,
        roundNumber: 2, sessionNumber: 2, matchOrder: 2,
        status: MatchStatus.PENDING, homeSets: 0, awaySets: 0, homeLegs: 0, awayLegs: 0,
        phaseMatchType: 'final',
      }));

      // Third-place match: loser of SF1 vs loser of SF2 (null = TBD)
      await this.matchRepo.save(this.matchRepo.create({
        leagueId, phaseId: nextPhase.id,
        homePlayerId: null, awayPlayerId: null,
        roundNumber: 2, sessionNumber: 2, matchOrder: 3,
        status: MatchStatus.PENDING, homeSets: 0, awaySets: 0, homeLegs: 0, awayLegs: 0,
        phaseMatchType: 'third_place',
      }));
    }

    await this.phaseRepo.update(nextPhase.id, { status: 'active', playerIds: nextPlayerIds });
    await this.leagueRepo.update(leagueId, { activePhaseId: nextPhase.id });

    return this.getPhases(clubId, leagueId);
  }
}
