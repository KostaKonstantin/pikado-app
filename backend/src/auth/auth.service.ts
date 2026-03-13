import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Club } from '../clubs/entities/club.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ClubRole } from '../common/enums';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    @InjectRepository(Membership) private membershipRepo: Repository<Membership>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email već postoji');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });
    await this.userRepo.save(user);

    // Create club
    const baseSlug = slugify(dto.clubName);
    const slug = `${baseSlug}-${Math.random().toString(36).substr(2, 6)}`;
    const club = this.clubRepo.create({
      name: dto.clubName,
      slug,
      city: dto.clubCity,
      country: dto.clubCountry,
    });
    await this.clubRepo.save(club);

    // Make user Club Admin
    const membership = this.membershipRepo.create({
      userId: user.id,
      clubId: club.id,
      role: ClubRole.CLUB_ADMIN,
    });
    await this.membershipRepo.save(membership);

    return this.generateTokenResponse(user, club, ClubRole.CLUB_ADMIN);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Pogrešan email ili lozinka');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Pogrešan email ili lozinka');

    // Get first membership
    const membership = await this.membershipRepo.findOne({
      where: { userId: user.id },
      relations: ['club'],
    });

    const club = membership?.club || null;
    const role = membership?.role || ClubRole.VIEWER;

    return this.generateTokenResponse(user, club, role);
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const memberships = await this.membershipRepo.find({
      where: { userId },
      relations: ['club'],
    });
    return { user, memberships };
  }

  private generateTokenResponse(user: User, club: Club | null, role: ClubRole) {
    const payload = {
      sub: user.id,
      email: user.email,
      clubId: club?.id,
      role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      club: club ? { id: club.id, name: club.name, slug: club.slug } : null,
      role,
    };
  }
}
