import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareToken } from './entities/share-token.entity';
import { League } from '../leagues/entities/league.entity';
import { LeaguePlayer } from '../leagues/entities/league-player.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';
import { LeagueSession } from '../leagues/entities/league-session.entity';
import { ShareService } from './share.service';
import { ShareController } from './share.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShareToken, League, LeaguePlayer, LeagueMatch, LeagueSession])],
  providers: [ShareService],
  controllers: [ShareController],
})
export class ShareModule {}
