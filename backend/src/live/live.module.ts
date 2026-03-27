import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveGateway } from './live.gateway';
import { LiveController } from './live.controller';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { Match } from '../matches/entities/match.entity';
import { Player } from '../players/entities/player.entity';
import { TournamentPlayer } from '../tournaments/entities/tournament-player.entity';
import { League } from '../leagues/entities/league.entity';
import { LeaguePlayer } from '../leagues/entities/league-player.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, Match, Player, TournamentPlayer, League, LeaguePlayer, LeagueMatch])],
  providers: [LiveGateway],
  controllers: [LiveController],
  exports: [LiveGateway],
})
export class LiveModule {}
