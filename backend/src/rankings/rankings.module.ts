import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingsService } from './rankings.service';
import { RankingsController } from './rankings.controller';
import { Ranking } from './entities/ranking.entity';
import { Match } from '../matches/entities/match.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';
import { Player } from '../players/entities/player.entity';
import { Membership } from '../memberships/entities/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ranking, Match, LeagueMatch, Player, Membership])],
  controllers: [RankingsController],
  providers: [RankingsService],
  exports: [RankingsService],
})
export class RankingsModule {}
