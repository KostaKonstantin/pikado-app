import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ShareToken } from './entities/share-token.entity';
import { League } from '../leagues/entities/league.entity';
import { LeaguePlayer } from '../leagues/entities/league-player.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';
import { LeagueSession } from '../leagues/entities/league-session.entity';
import { CompetitionPhase } from '../leagues/entities/competition-phase.entity';
import { Player } from '../players/entities/player.entity';
import { MatchStatus, LeagueFormat } from '../common/enums';
import { buildPlayerForm, winPercent } from './player-form';
import { rrStats } from '../leagues/fixture.service';

@Injectable()
export class ShareService {
  /**
   * In-memory cache for public share payloads, keyed by token.
   *
   * The /share/:token endpoint is hit not only by human visitors but by
   * link-preview crawlers (WhatsApp/Viber/Messenger/Facebook) that re-fetch
   * the OG image repeatedly. Without a cache each hit triggers the full
   * (query-heavy) getByToken read against the database — which is what burns
   * Neon's network-transfer (egress) allowance. A short TTL collapses bursts
   * of identical reads into a single DB query while keeping standings fresh
   * enough for a public table (admins manually refresh anyway).
   */
  private cache = new Map<string, { data: any; expires: number }>();
  private static readonly CACHE_TTL_MS = 30_000;

  constructor(
    @InjectRepository(ShareToken) private tokenRepo: Repository<ShareToken>,
    @InjectRepository(League) private leagueRepo: Repository<League>,
    @InjectRepository(LeaguePlayer) private lpRepo: Repository<LeaguePlayer>,
    @InjectRepository(LeagueMatch) private lmRepo: Repository<LeagueMatch>,
    @InjectRepository(LeagueSession) private sessionRepo: Repository<LeagueSession>,
    @InjectRepository(CompetitionPhase) private phaseRepo: Repository<CompetitionPhase>,
    @InjectRepository(Player) private playerRepo: Repository<Player>,
  ) {}

  async generateOrGet(leagueId: string, clubId: string): Promise<string> {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId, clubId } });
    if (!league) throw new NotFoundException('Liga nije pronađena');

    const existing = await this.tokenRepo.findOne({ where: { leagueId } });
    if (existing) return existing.token;

    const token = crypto.randomBytes(32).toString('hex');
    await this.tokenRepo.save(this.tokenRepo.create({ leagueId, token }));
    return token;
  }

  private buildMatchRow(m: LeagueMatch) {
    return {
      id: m.id,
      homePlayer: m.homePlayer ? { id: m.homePlayer.id, fullName: m.homePlayer.fullName } : null,
      awayPlayer: m.awayPlayer ? { id: m.awayPlayer.id, fullName: m.awayPlayer.fullName } : null,
      homeSets: m.homeSets,
      awaySets: m.awaySets,
      status: m.status,
      winnerId: m.winnerId,
      isWalkover: m.isWalkover,
      isDnfResult: m.isDnfResult,
      dnfPlayerId: m.dnfPlayerId,
      isPostponed: m.isPostponed,
      scheduledDate: m.scheduledDate,
    };
  }

  /**
   * Phase/season progress for the public page: how many matches are played
   * out of the total the round-robin schedule will ever have.
   *
   * `total` comes from the schedule FORMULA (rrStats), exactly like the admin
   * dashboard's getScheduleStats — so it is correct even before every match is
   * generated or assigned to a Ligaški Dan (EuroLeague). `played` counts
   * COMPLETED matches only (walkover is not counted), matching the admin.
   */
  static computeProgress(playerCount: number, homeAway: boolean, completedCount: number) {
    return { played: completedCount, total: rrStats(playerCount, homeAway).totalMatches };
  }

  private buildStandings(
    players: Player[],
    completedMatches: LeagueMatch[],
    league: League,
    dnfPlayerIds = new Set<string>(),
    rankMovements: Record<string, { previousPosition: number; currentPosition: number; delta: number }> = {},
  ) {
    const statsMap = new Map<string, any>();
    const playerMatches = new Map<string, LeagueMatch[]>();
    for (const p of players) {
      statsMap.set(p.id, {
        player: { id: p.id, fullName: p.fullName },
        played: 0, won: 0, lost: 0, drawn: 0,
        setsFor: 0, setsAgainst: 0, points: 0,
      });
      playerMatches.set(p.id, []);
    }

    const h2hPoints = new Map<string, number>();
    for (const m of completedMatches) {
      const home = statsMap.get(m.homePlayerId!);
      const away = statsMap.get(m.awayPlayerId!);
      if (!home || !away) continue;
      playerMatches.get(m.homePlayerId!)!.push(m);
      playerMatches.get(m.awayPlayerId!)!.push(m);
      home.played++; away.played++;
      home.setsFor += m.homeSets; home.setsAgainst += m.awaySets;
      away.setsFor += m.awaySets; away.setsAgainst += m.homeSets;
      const hKey = `${m.homePlayerId}→${m.awayPlayerId}`;
      const aKey = `${m.awayPlayerId}→${m.homePlayerId}`;
      if (m.winnerId === m.homePlayerId) {
        home.won++; home.points += league.pointsWin;
        away.lost++; away.points += league.pointsLoss;
        h2hPoints.set(hKey, (h2hPoints.get(hKey) ?? 0) + league.pointsWin);
        h2hPoints.set(aKey, (h2hPoints.get(aKey) ?? 0) + league.pointsLoss);
      } else if (m.winnerId === m.awayPlayerId) {
        away.won++; away.points += league.pointsWin;
        home.lost++; home.points += league.pointsLoss;
        h2hPoints.set(hKey, (h2hPoints.get(hKey) ?? 0) + league.pointsLoss);
        h2hPoints.set(aKey, (h2hPoints.get(aKey) ?? 0) + league.pointsWin);
      } else {
        home.drawn++; away.drawn++;
        home.points += league.pointsDraw; away.points += league.pointsDraw;
        h2hPoints.set(hKey, (h2hPoints.get(hKey) ?? 0) + league.pointsDraw);
        h2hPoints.set(aKey, (h2hPoints.get(aKey) ?? 0) + league.pointsDraw);
      }
    }

    const expectedDnfMatches = Math.max((players.length - 1) * 2, 0);
    for (const playerId of dnfPlayerIds) {
      const standing = statsMap.get(playerId);
      if (!standing) continue;
      standing.played = expectedDnfMatches;
      standing.won = 0;
      standing.drawn = 0;
      standing.lost = expectedDnfMatches;
      standing.setsFor = 0;
      standing.setsAgainst = expectedDnfMatches * 4;
      standing.points = expectedDnfMatches * league.pointsLoss;
    }

    const getH2H = (a: string, b: string) => h2hPoints.get(`${a}→${b}`) ?? 0;
    return Array.from(statsMap.values())
      .sort((a, b) => {
        const aDnf = dnfPlayerIds.has(a.player.id);
        const bDnf = dnfPlayerIds.has(b.player.id);
        if (aDnf !== bDnf) return aDnf ? 1 : -1;
        if (b.points !== a.points) return b.points - a.points;
        const aDiff = a.setsFor - a.setsAgainst;
        const bDiff = b.setsFor - b.setsAgainst;
        if (bDiff !== aDiff) return bDiff - aDiff;
        if (b.setsFor !== a.setsFor) return b.setsFor - a.setsFor;
        return getH2H(b.player.id, a.player.id) - getH2H(a.player.id, b.player.id);
      })
      .map((s, i) => {
        const movement = rankMovements[s.player.id];
        const isDnf = dnfPlayerIds.has(s.player.id);
        // DNF records are administratively zeroed, so suppress their form/streak.
        const { form, streak } = isDnf
          ? { form: [], streak: null }
          : buildPlayerForm(s.player.id, playerMatches.get(s.player.id) ?? []);
        return {
          position: i + 1,
          ...s,
          isDnf,
          winPct: winPercent(s.won, s.played),
          form,
          streak,
          previousPosition: movement?.previousPosition ?? null,
          rankDelta: movement?.delta ?? 0,
        };
      });
  }

  async getByToken(token: string) {
    const cached = this.cache.get(token);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const data = await this.buildShareData(token);
    this.cache.set(token, { data, expires: Date.now() + ShareService.CACHE_TTL_MS });
    return data;
  }

  /**
   * Clears the whole share cache. Called by ShareCacheSubscriber whenever any
   * share-relevant row changes, so an admin's edit (result, DNF, reschedule…)
   * is reflected on the public page on the very next request — no staleness.
   * The cache only ever holds a handful of tokens, so clearing all is cheap.
   */
  invalidateAll() {
    this.cache.clear();
  }

  private async buildShareData(token: string) {
    const record = await this.tokenRepo.findOne({ where: { token } });
    if (!record) throw new NotFoundException('Link nije validan');

    const league = await this.leagueRepo.findOne({ where: { id: record.leagueId } });
    if (!league) throw new NotFoundException('Liga nije pronađena');

    const isEuroleague = league.mode === 'euroleague';

    // ── Regular season standings ───────────────────────────────────────────
    const leaguePlayers = await this.lpRepo.find({
      where: { leagueId: league.id },
      relations: ['player'],
    });

    const regularCompleted = await this.lmRepo.find({
      where: { leagueId: league.id, status: MatchStatus.COMPLETED, phaseId: null as any },
    });

    const regularPlayers = leaguePlayers.map(lp => lp.player);
    const standings = this.buildStandings(
      regularPlayers,
      regularCompleted,
      league,
      new Set<string>(),
      league.rankMovements?.regular ?? {},
    );

    // ── Regular season groups ──────────────────────────────────────────────
    let groups: { label: number; sessionStatus?: string; matches: any[] }[] = [];

    if (isEuroleague) {
      const sessions = await this.sessionRepo.find({
        where: { leagueId: league.id },
        order: { sessionNumber: 'ASC' },
      });

      for (const session of sessions) {
        const matches = await this.lmRepo.find({
          where: { leagueId: league.id, sessionId: session.id },
          relations: ['homePlayer', 'awayPlayer'],
          order: { matchOrder: 'ASC' },
        });

        const visible = matches.filter(m => m.homePlayerId !== null && m.awayPlayerId !== null);
        if (visible.length === 0) continue;

        groups.push({
          label: session.sessionNumber,
          sessionStatus: session.status,
          matches: visible.map(m => this.buildMatchRow(m)),
        });
      }
    } else {
      const allMatches = await this.lmRepo.find({
        where: { leagueId: league.id, phaseId: null as any },
        relations: ['homePlayer', 'awayPlayer'],
        order: { roundNumber: 'ASC', matchOrder: 'ASC' },
      });

      const roundsMap = new Map<number, any[]>();
      for (const m of allMatches) {
        if (m.homePlayerId === null && m.awayPlayerId === null) continue;
        if (!roundsMap.has(m.roundNumber)) roundsMap.set(m.roundNumber, []);
        roundsMap.get(m.roundNumber)!.push(this.buildMatchRow(m));
      }

      groups = Array.from(roundsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, matches]) => ({ label: round, matches }));
    }

    // ── Competition phases (baraž, top 10, final four…) ───────────────────
    const phases = await this.phaseRepo.find({
      where: { leagueId: league.id, status: In(['active', 'completed']) },
      order: { phaseOrder: 'ASC' },
    });

    const phasesData = await Promise.all(
      phases.map(async (phase) => {
        const players = phase.playerIds.length > 0
          ? await this.playerRepo.findBy({ id: In(phase.playerIds) })
          : [];

        const phaseMatches = await this.lmRepo.find({
          where: { leagueId: league.id, phaseId: phase.id },
          relations: ['homePlayer', 'awayPlayer'],
          order: { sessionNumber: 'ASC', matchOrder: 'ASC' },
        });

        const phaseCompleted = phaseMatches.filter(
          m => m.status === MatchStatus.COMPLETED || m.status === MatchStatus.WALKOVER,
        );

        const phaseStandings = phase.type === 'round_robin'
          ? this.buildStandings(
              players,
              phaseCompleted,
              league,
              new Set(phase.dnfPlayerIds ?? []),
              league.rankMovements?.[phase.id] ?? {},
            )
          : [];

        let phaseGroups: { label: number; sessionStatus?: string; matches: any[] }[] = [];

        if (isEuroleague) {
          if (phase.type === 'knockout') {
            // Knockout: show all matches grouped by roundNumber (no session concept)
            const roundsMap = new Map<number, any[]>();
            for (const m of phaseMatches) {
              if (m.homePlayerId === null && m.awayPlayerId === null) continue;
              if (!roundsMap.has(m.roundNumber)) roundsMap.set(m.roundNumber, []);
              roundsMap.get(m.roundNumber)!.push(this.buildMatchRow(m));
            }
            phaseGroups = Array.from(roundsMap.entries())
              .sort(([a], [b]) => a - b)
              .map(([round, matches]) => ({ label: round, matches }));
          } else {
            // Round robin: only show matches assigned to an explicit Ligaški Dan (sessionId not null)
            const assignedMatches = phaseMatches.filter(m => m.sessionId !== null && m.homePlayerId !== null && m.awayPlayerId !== null);
            const dnfMatches = phaseMatches.filter(m => m.isDnfResult && m.sessionId === null && m.homePlayerId !== null && m.awayPlayerId !== null);
            const sessionIds = [...new Set(assignedMatches.map(m => m.sessionId as string))];

            for (const sessionId of sessionIds) {
              const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
              if (!session) continue;

              const sessionMatches = assignedMatches.filter(m => m.sessionId === sessionId);
              if (sessionMatches.length === 0) continue;

              phaseGroups.push({
                label: session.sessionNumber,
                sessionStatus: session.status,
                matches: sessionMatches.map(m => this.buildMatchRow(m)),
              });
            }
            if (dnfMatches.length > 0) {
              phaseGroups.push({
                label: -1,
                matches: dnfMatches.map(m => this.buildMatchRow(m)),
              });
            }
            phaseGroups.sort((a, b) => (a.label === -1 ? Number.MAX_SAFE_INTEGER : a.label) - (b.label === -1 ? Number.MAX_SAFE_INTEGER : b.label));
          }
        } else {
          const roundsMap = new Map<number, any[]>();
          for (const m of phaseMatches) {
            if (m.homePlayerId === null && m.awayPlayerId === null) continue;
            if (!roundsMap.has(m.roundNumber)) roundsMap.set(m.roundNumber, []);
            roundsMap.get(m.roundNumber)!.push(this.buildMatchRow(m));
          }
          phaseGroups = Array.from(roundsMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, matches]) => ({ label: round, matches }));
        }

        const progress = phase.type === 'round_robin'
          ? ShareService.computeProgress(
              phase.playerIds.length,
              true, // all competition phases are double round-robin
              phaseMatches.filter(m => m.status === MatchStatus.COMPLETED).length,
            )
          : null;

        return {
          id: phase.id,
          name: phase.name,
          type: phase.type,
          status: phase.status,
          phaseOrder: phase.phaseOrder,
          standings: phaseStandings,
          groups: phaseGroups,
          progress,
        };
      }),
    );

    const regularProgress = ShareService.computeProgress(
      regularPlayers.length,
      league.format === LeagueFormat.HOME_AWAY,
      regularCompleted.length,
    );

    return {
      league: {
        id: league.id,
        name: league.name,
        format: league.format,
        status: league.status,
        mode: league.mode,
      },
      standings,
      groups,
      isEuroleague,
      phases: phasesData,
      progress: regularProgress,
    };
  }
}
