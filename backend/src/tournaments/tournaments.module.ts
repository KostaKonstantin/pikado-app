import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { BracketService } from './bracket.service';
import { Tournament } from './entities/tournament.entity';
import { TournamentPlayer } from './entities/tournament-player.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { Match } from '../matches/entities/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, TournamentPlayer, Membership, Match])],
  controllers: [TournamentsController],
  providers: [TournamentsService, BracketService],
  exports: [TournamentsService, BracketService],
})
export class TournamentsModule {}
