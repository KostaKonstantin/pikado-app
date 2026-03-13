import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaguesService } from './leagues.service';
import { LeaguesController } from './leagues.controller';
import { FixtureService } from './fixture.service';
import { League } from './entities/league.entity';
import { LeaguePlayer } from './entities/league-player.entity';
import { LeagueMatch } from './entities/league-match.entity';
import { Membership } from '../memberships/entities/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([League, LeaguePlayer, LeagueMatch, Membership])],
  controllers: [LeaguesController],
  providers: [LeaguesService, FixtureService],
  exports: [LeaguesService],
})
export class LeaguesModule {}
