import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClubsModule } from './clubs/clubs.module';
import { PlayersModule } from './players/players.module';
import { SeasonsModule } from './seasons/seasons.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { MatchesModule } from './matches/matches.module';
import { LeaguesModule } from './leagues/leagues.module';
import { RankingsModule } from './rankings/rankings.module';
import { LiveModule } from './live/live.module';
import { InvitesModule } from './invites/invites.module';

// Entities
import { User } from './users/entities/user.entity';
import { Invite } from './invites/entities/invite.entity';
import { Club } from './clubs/entities/club.entity';
import { Membership } from './memberships/entities/membership.entity';
import { Player } from './players/entities/player.entity';
import { Season } from './seasons/entities/season.entity';
import { Tournament } from './tournaments/entities/tournament.entity';
import { TournamentPlayer } from './tournaments/entities/tournament-player.entity';
import { Match } from './matches/entities/match.entity';
import { League } from './leagues/entities/league.entity';
import { LeaguePlayer } from './leagues/entities/league-player.entity';
import { LeagueMatch } from './leagues/entities/league-match.entity';
import { LeagueSession } from './leagues/entities/league-session.entity';
import { LeagueSubstitution } from './leagues/entities/league-substitution.entity';
import { Ranking } from './rankings/entities/ranking.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pikado',
      entities: [
        User, Club, Membership, Player, Season,
        Tournament, TournamentPlayer, Match,
        League, LeaguePlayer, LeagueMatch, LeagueSession, LeagueSubstitution, Ranking,
        Invite,
      ],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    AuthModule,
    UsersModule,
    ClubsModule,
    PlayersModule,
    SeasonsModule,
    TournamentsModule,
    MatchesModule,
    LeaguesModule,
    RankingsModule,
    LiveModule,
    InvitesModule,
  ],
})
export class AppModule {}
