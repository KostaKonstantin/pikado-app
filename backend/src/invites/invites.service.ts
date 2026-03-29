import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Invite, InviteStatus } from './entities/invite.entity';
import { User } from '../users/entities/user.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { Club } from '../clubs/entities/club.entity';
import { ClubRole } from '../common/enums';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite) private inviteRepo: Repository<Invite>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Membership) private membershipRepo: Repository<Membership>,
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async create(clubId: string, email: string) {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Klub nije pronađen');

    // Check if user is already a member
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      const existingMembership = await this.membershipRepo.findOne({
        where: { userId: existingUser.id, clubId },
      });
      if (existingMembership) {
        throw new ConflictException('Korisnik je već član ovog kluba');
      }
    }

    // Cancel any existing pending invite for same email+club
    await this.inviteRepo.update(
      { email, clubId, status: InviteStatus.PENDING },
      { status: InviteStatus.CANCELLED },
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const invite = this.inviteRepo.create({
      email,
      clubId,
      token: this.generateToken(),
      expiresAt,
      status: InviteStatus.PENDING,
    });

    const saved = await this.inviteRepo.save(invite);

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3002');
    await this.emailService.sendInvite({
      to: email,
      clubName: club.name,
      inviteUrl: `${frontendUrl}/invite/${saved.token}`,
    });

    return saved;
  }

  async findAll(clubId: string) {
    return this.inviteRepo.find({
      where: { clubId },
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(clubId: string, inviteId: string) {
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId, clubId } });
    if (!invite) throw new NotFoundException('Pozivnica nije pronađena');
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Samo pending pozivnice mogu biti otkazane');
    }
    invite.status = InviteStatus.CANCELLED;
    return this.inviteRepo.save(invite);
  }

  async resend(clubId: string, inviteId: string) {
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId, clubId } });
    if (!invite) throw new NotFoundException('Pozivnica nije pronađena');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    invite.token = this.generateToken();
    invite.expiresAt = expiresAt;
    invite.status = InviteStatus.PENDING;

    const saved = await this.inviteRepo.save(invite);

    const club = await this.clubRepo.findOne({ where: { id: invite.clubId } });
    if (club) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3002');
      await this.emailService.sendInvite({
        to: invite.email,
        clubName: club.name,
        inviteUrl: `${frontendUrl}/invite/${saved.token}`,
      });
    }

    return saved;
  }

  async findByToken(token: string) {
    const invite = await this.inviteRepo.findOne({
      where: { token },
      relations: ['club'],
    });
    if (!invite) throw new NotFoundException('Pozivnica nije pronađena');
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Ova pozivnica više nije aktivna');
    }
    if (invite.expiresAt < new Date()) {
      invite.status = InviteStatus.EXPIRED;
      await this.inviteRepo.save(invite);
      throw new BadRequestException('Pozivnica je istekla');
    }
    return invite;
  }

  async accept(token: string, data: { password?: string; userId?: string }) {
    const invite = await this.findByToken(token);

    let user: User;

    if (data.userId) {
      // Authenticated user accepting invite — verify email matches
      const found = await this.userRepo.findOne({ where: { id: data.userId } });
      if (!found) throw new NotFoundException('Korisnik nije pronađen');
      user = found;
      if (user.email !== invite.email) {
        throw new BadRequestException('Email ne odgovara pozivnici');
      }
    } else {
      // Anonymous accept — check if user exists by email
      const existingUser = await this.userRepo.findOne({ where: { email: invite.email } });
      if (existingUser) {
        // Existing user must provide password
        if (!data.password) {
          throw new BadRequestException('Unesite lozinku za postojeći nalog');
        }
        const valid = await bcrypt.compare(data.password, existingUser.passwordHash);
        if (!valid) throw new BadRequestException('Pogrešna lozinka');
        user = existingUser;
      } else {
        // New user — password required
        if (!data.password || data.password.length < 6) {
          throw new BadRequestException('Lozinka mora imati najmanje 6 karaktera');
        }
        const passwordHash = await bcrypt.hash(data.password, 12);
        user = this.userRepo.create({
          email: invite.email,
          passwordHash,
          fullName: invite.email.split('@')[0],
        });
        await this.userRepo.save(user);
      }
    }

    // Check not already a member
    const existingMembership = await this.membershipRepo.findOne({
      where: { userId: user.id, clubId: invite.clubId },
    });
    if (!existingMembership) {
      const membership = this.membershipRepo.create({
        userId: user.id,
        clubId: invite.clubId,
        role: ClubRole.VIEWER,
      });
      await this.membershipRepo.save(membership);
    }

    // Mark invite as accepted
    invite.status = InviteStatus.ACCEPTED;
    await this.inviteRepo.save(invite);

    const club = await this.clubRepo.findOne({ where: { id: invite.clubId } });

    const payload = {
      sub: user.id,
      email: user.email,
      clubId: club?.id,
      role: ClubRole.VIEWER,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
      club: club
        ? {
            id: club.id,
            name: club.name,
            slug: club.slug,
            city: club.city,
            country: club.country,
            logoUrl: club.logoUrl,
          }
        : null,
      role: ClubRole.VIEWER,
    };
  }
}
