import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ShareToken } from './entities/share-token.entity';
import { League } from '../leagues/entities/league.entity';
import { LeaguePlayer } from '../leagues/entities/league-player.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';
import { LeagueSession } from '../leagues/entities/league-session.entity';
import { MatchStatus } from '../common/enums';

@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(ShareToken) private tokenRepo: Repository<ShareToken>,
    @InjectRepository(League) private leagueRepo: Repository<League>,
    @InjectRepository(LeaguePlayer) private lpRepo: Repository<LeaguePlayer>,
    @InjectRepository(LeagueMatch) private lmRepo: Repository<LeagueMatch>,
    @InjectRepository(LeagueSession) private sessionRepo: Repository<LeagueSession>,
  ) {}

  /** Returns existing token for this league or creates a new one. */
  async generateOrGet(leagueId: string, clubId: string): Promise<string> {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId, clubId } });
    if (!league) throw new NotFoundException('Liga nije pronađena');

    const existing = await this.tokenRepo.findOne({ where: { leagueId } });
    if (existing) return existing.token;

    const token = crypto.randomBytes(32).toString('hex');
    await this.tokenRepo.save(this.tokenRepo.create({ leagueId, token }));
    return token;
  }

  /** Fetch all public data for a share link — standings + matches. */
  async getByToken(token: string) {
    const record = await this.tokenRepo.findOne({ where: { token } });
    if (!record) throw new NotFoundException('Link nije validan');

    const league = await this.leagueRepo.findOne({ where: { id: record.leagueId } });
    if (!league) throw new NotFoundException('Liga nije pronađena');

    // ── standings ──────────────────────────────────────────────────────────
    const leaguePlayers = await this.lpRepo.find({
      where: { leagueId: league.id },
      relations: ['player'],
    });

    const completedMatches = await this.lmRepo.find({
      where: { leagueId: league.id, status: MatchStatus.COMPLETED },
    });

    const statsMap = new Map<string, any>();
    for (const lp of leaguePlayers) {
      statsMap.set(lp.playerId, {
        player: lp.player,
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
    const standings = Array.from(statsMap.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aDiff = a.setsFor - a.setsAgainst;
        const bDiff = b.setsFor - b.setsAgainst;
        if (bDiff !== aDiff) return bDiff - aDiff;
        if (b.setsFor !== a.setsFor) return b.setsFor - a.setsFor;
        return getH2H(b.player?.id, a.player?.id) - getH2H(a.player?.id, b.player?.id);
      })
      .map((s, i) => ({ position: i + 1, ...s }));

    // ── matches/rounds ─────────────────────────────────────────────────────
    const isEuroleague = league.mode === 'euroleague';

    let groups: { label: number; sessionStatus?: string; matches: any[] }[] = [];

    if (isEuroleague) {
      // Only show sessions that have been created (open or closed)
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

        const visible = matches.filter(
          (m) => m.homePlayerId !== null && m.awayPlayerId !== null,
        );
        if (visible.length === 0) continue;

        groups.push({
          label: session.sessionNumber,
          sessionStatus: session.status, // 'open' | 'closed'
          matches: visible.map((m) => ({
            id: m.id,
            homePlayer: m.homePlayer ? { id: m.homePlayer.id, fullName: m.homePlayer.fullName } : null,
            awayPlayer: m.awayPlayer ? { id: m.awayPlayer.id, fullName: m.awayPlayer.fullName } : null,
            homeSets: m.homeSets,
            awaySets: m.awaySets,
            status: m.status,
            winnerId: m.winnerId,
            isPostponed: m.isPostponed,
            scheduledDate: m.scheduledDate,
          })),
        });
      }
    } else {
      // Round-robin / session mode — show all rounds
      const allMatches = await this.lmRepo.find({
        where: { leagueId: league.id },
        relations: ['homePlayer', 'awayPlayer'],
        order: { roundNumber: 'ASC', matchOrder: 'ASC' },
      });

      const roundsMap = new Map<number, any[]>();
      for (const m of allMatches) {
        if (m.homePlayerId === null && m.awayPlayerId === null) continue;
        if (!roundsMap.has(m.roundNumber)) roundsMap.set(m.roundNumber, []);
        roundsMap.get(m.roundNumber)!.push({
          id: m.id,
          homePlayer: m.homePlayer ? { id: m.homePlayer.id, fullName: m.homePlayer.fullName } : null,
          awayPlayer: m.awayPlayer ? { id: m.awayPlayer.id, fullName: m.awayPlayer.fullName } : null,
          homeSets: m.homeSets,
          awaySets: m.awaySets,
          status: m.status,
          winnerId: m.winnerId,
          isPostponed: m.isPostponed,
          scheduledDate: m.scheduledDate,
        });
      }

      groups = Array.from(roundsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, matches]) => ({ label: round, matches }));
    }

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
    };
  }
}
