import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { Player } from './entities/player.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { Match } from '../matches/entities/match.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, Membership, Match, LeagueMatch])],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
