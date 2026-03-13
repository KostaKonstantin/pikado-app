import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveGateway } from './live.gateway';
import { LiveController } from './live.controller';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { Match } from '../matches/entities/match.entity';
import { Player } from '../players/entities/player.entity';
import { TournamentPlayer } from '../tournaments/entities/tournament-player.entity';
import { League } from '../leagues/entities/league.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, Match, Player, TournamentPlayer, League])],
  providers: [LiveGateway],
  controllers: [LiveController],
  exports: [LiveGateway],
})
export class LiveModule {}
