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
import { MatchStatus } from '../common/enums';

@Injectable()
export class ShareService {
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
      isPostponed: m.isPostponed,
      scheduledDate: m.scheduledDate,
    };
  }

  private buildStandings(players: Player[], completedMatches: LeagueMatch[], league: League) {
    const statsMap = new Map<string, any>();
    for (const p of players) {
      statsMap.set(p.id, {
        player: { id: p.id, fullName: p.fullName },
        played: 0, won: 0, lost: 0, drawn: 0,
        setsFor: 0, setsAgainst: 0, points: 0,
      });
    }

    const h2hPoints = new Map<string, number>();
    for (const m of completedMatches) {
      const home = statsMap.get(m.homePlayerId!);
      const away = statsMap.get(m.awayPlayerId!);
      if (!home || !away) continue;
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

    const getH2H = (a: string, b: string) => h2hPoints.get(`${a}→${b}`) ?? 0;
    return Array.from(statsMap.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aDiff = a.setsFor - a.setsAgainst;
        const bDiff = b.setsFor - b.setsAgainst;
        if (bDiff !== aDiff) return bDiff - aDiff;
        if (b.setsFor !== a.setsFor) return b.setsFor - a.setsFor;
        return getH2H(b.player.id, a.player.id) - getH2H(a.player.id, b.player.id);
      })
      .map((s, i) => ({ position: i + 1, ...s }));
  }

  async getByToken(token: string) {
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
    const standings = this.buildStandings(regularPlayers, regularCompleted, league);

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
          ? this.buildStandings(players, phaseCompleted, league)
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
            phaseGroups.sort((a, b) => a.label - b.label);
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

        return {
          id: phase.id,
          name: phase.name,
          type: phase.type,
          status: phase.status,
          phaseOrder: phase.phaseOrder,
          standings: phaseStandings,
          groups: phaseGroups,
        };
      }),
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
    };
  }
}
