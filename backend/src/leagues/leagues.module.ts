import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaguesService } from './leagues.service';
import { LeaguesController } from './leagues.controller';
import { FixtureService } from './fixture.service';
import { SessionService } from './session.service';
import { League } from './entities/league.entity';
import { LeaguePlayer } from './entities/league-player.entity';
import { LeagueMatch } from './entities/league-match.entity';
import { LeagueSession } from './entities/league-session.entity';
import { LeagueSubstitution } from './entities/league-substitution.entity';
import { Membership } from '../memberships/entities/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([League, LeaguePlayer, LeagueMatch, LeagueSession, LeagueSubstitution, Membership])],
  controllers: [LeaguesController],
  providers: [LeaguesService, FixtureService, SessionService],
  exports: [LeaguesService],
})
export class LeaguesModule {}
