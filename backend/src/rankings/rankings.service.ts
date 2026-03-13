import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ranking } from './entities/ranking.entity';
import { Match } from '../matches/entities/match.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';
import { Player } from '../players/entities/player.entity';
import { MatchStatus } from '../common/enums';

@Injectable()
export class RankingsService {
  constructor(
    @InjectRepository(Ranking) private rankingRepo: Repository<Ranking>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(LeagueMatch) private lmRepo: Repository<LeagueMatch>,
    @InjectRepository(Player) private playerRepo: Repository<Player>,
  ) {}

  async getClubRankings(clubId: string, seasonId?: string) {
    const qb = this.rankingRepo
      .createQueryBuilder('r')
      .where('r.clubId = :clubId', { clubId })
      .orderBy('r.points', 'DESC')
      .addOrderBy('r.winRate', 'DESC');

    if (seasonId) {
      qb.andWhere('r.seasonId = :seasonId', { seasonId });
    } else {
      qb.andWhere('r.seasonId IS NULL');
    }

    const rankings = await qb.getMany();

    // Enrich with player info
    const playerIds = rankings.map((r) => r.playerId);
    if (playerIds.length === 0) return [];

    const players = await this.playerRepo.findByIds(playerIds);
    const playerMap = new Map(players.map((p) => [p.id, p]));

    return rankings.map((r, i) => ({
      position: i + 1,
      player: playerMap.get(r.playerId),
      points: r.points,
      matchesPlayed: r.matchesPlayed,
      matchesWon: r.matchesWon,
      matchesLost: r.matchesLost,
      winRate: r.winRate,
    }));
  }

  async recalculateForClub(clubId: string) {
    const players = await this.playerRepo.find({ where: { clubId, isActive: true } });

    for (const player of players) {
      await this.recalculateForPlayer(clubId, player.id, null);
    }
  }

  async recalculateForPlayer(clubId: string, playerId: string, seasonId: string | null) {
    // Tournament matches
    const tMatches = await this.matchRepo.find({
      where: [
        { player1Id: playerId, status: MatchStatus.COMPLETED },
        { player2Id: playerId, status: MatchStatus.COMPLETED },
      ],
    });

    // League matches
    const lMatches = await this.lmRepo.find({
      where: [
        { homePlayerId: playerId, status: MatchStatus.COMPLETED },
        { awayPlayerId: playerId, status: MatchStatus.COMPLETED },
      ],
    });

    let wins = 0, losses = 0, drawn = 0;
    let points = 0;

    for (const m of tMatches) {
      if (m.winnerId === playerId) { wins++; points += 3; }
      else { losses++; }
    }

    for (const m of lMatches) {
      if (m.winnerId === playerId) { wins++; points += 2; }
      else if (!m.winnerId) { drawn++; points += 1; }
      else { losses++; }
    }

    const played = wins + losses + drawn;
    const winRate = played > 0 ? parseFloat(((wins / played) * 100).toFixed(2)) : 0;

    await this.rankingRepo.upsert(
      {
        clubId,
        playerId,
        seasonId,
        points,
        matchesPlayed: played,
        matchesWon: wins,
        matchesLost: losses,
        matchesDrawn: drawn,
        winRate,
      },
      ['clubId', 'playerId', 'seasonId'],
    );
  }
}
