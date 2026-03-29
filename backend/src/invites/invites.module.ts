import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Invite } from './entities/invite.entity';
import { User } from '../users/entities/user.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { Club } from '../clubs/entities/club.entity';
import { InvitesService } from './invites.service';
import { ClubInvitesController, PublicInvitesController } from './invites.controller';
import { EmailService } from './email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invite, User, Membership, Club]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'pikado-secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [ClubInvitesController, PublicInvitesController],
  providers: [InvitesService, EmailService],
})
export class InvitesModule {}
