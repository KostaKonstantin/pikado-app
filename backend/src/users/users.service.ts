import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Korisnik nije pronađen');
    return user;
  }

  private sanitize(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    };
  }

  async updateProfile(userId: string, data: { fullName?: string }) {
    await this.userRepo.update(userId, data);
    const user = await this.findById(userId);
    return this.sanitize(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.findById(userId);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Pogrešna trenutna lozinka');
    if (newPassword.length < 6) throw new BadRequestException('Nova lozinka mora imati najmanje 6 karaktera');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(userId, { passwordHash: hash });
    return { message: 'Lozinka uspešno promenjena' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    await this.userRepo.update(userId, { avatarUrl });
    const user = await this.findById(userId);
    return this.sanitize(user);
  }
}
