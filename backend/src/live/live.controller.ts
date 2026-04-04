import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { Match } from '../matches/entities/match.entity';
import { Player } from '../players/entities/player.entity';
import { TournamentPlayer } from '../tournaments/entities/tournament-player.entity';
import { League } from '../leagues/entities/league.entity';
import { LeaguePlayer } from '../leagues/entities/league-player.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';
import { MatchStatus } from '../common/enums';

@Controller()
export class LiveController {
  constructor(
    @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(Player) private playerRepo: Repository<Player>,
    @InjectRepository(TournamentPlayer) private tpRepo: Repository<TournamentPlayer>,
    @InjectRepository(League) private leagueRepo: Repository<League>,
    @InjectRepository(LeaguePlayer) private lpRepo: Repository<LeaguePlayer>,
    @InjectRepository(LeagueMatch) private lmRepo: Repository<LeagueMatch>,
  ) {}

  @Get('tournaments/by-slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const tournament = await this.tournamentRepo.findOne({ where: { slug } });
    if (!tournament) return null;

    const tournamentPlayers = await this.tpRepo.find({
      where: { tournamentId: tournament.id },
      relations: ['player'],
    });

    const matches = await this.matchRepo.find({
      where: { tournamentId: tournament.id },
      order: { round: 'ASC', matchNumber: 'ASC' },
    });

    const rounds = new Map<number, Match[]>();
    for (const m of matches) {
      if (!rounds.has(m.round)) rounds.set(m.round, []);
      rounds.get(m.round)!.push(m);
    }

    const bracket = Array.from(rounds.entries()).map(([round, ms]) => ({ round, matches: ms }));

    return {
      tournament,
      players: tournamentPlayers.map((tp) => tp.player),
      bracket,
    };
  }

  @Get('leagues/by-slug/:slug')
  async getLeagueBySlug(@Param('slug') slug: string) {
    return this.leagueRepo.findOne({ where: { slug } });
  }

  @Get('leagues/by-slug/:slug/standings')
  async getLeagueStandingsBySlug(@Param('slug') slug: string) {
    const league = await this.leagueRepo.findOne({ where: { slug } });
    if (!league) throw new NotFoundException('Liga nije pronađena');

    const players = await this.lpRepo.find({ where: { leagueId: league.id }, relations: ['player'] });
    const matches = await this.lmRepo.find({ where: { leagueId: league.id, status: MatchStatus.COMPLETED } });

    const statsMap = new Map<string, any>();
    for (const lp of players) {
      statsMap.set(lp.playerId, {
        player: lp.player,
        played: 0, won: 0, lost: 0, drawn: 0,
        setsFor: 0, setsAgainst: 0, points: 0,
      });
    }

    const h2hPoints = new Map<string, number>();
    for (const m of matches) {
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

    return {
      league: { name: league.name, slug: league.slug, format: league.format, status: league.status },
      standings: Array.from(statsMap.values())
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          const aDiff = a.setsFor - a.setsAgainst;
          const bDiff = b.setsFor - b.setsAgainst;
          if (bDiff !== aDiff) return bDiff - aDiff;
          if (b.setsFor !== a.setsFor) return b.setsFor - a.setsFor;
          return getH2H(b.player?.id, a.player?.id) - getH2H(a.player?.id, b.player?.id);
        })
        .map((s, i) => ({ position: i + 1, ...s })),
    };
  }
}
