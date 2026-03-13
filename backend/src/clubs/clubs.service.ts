import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Club } from './entities/club.entity';
import { Membership } from '../memberships/entities/membership.entity';

@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club) private clubRepo: Repository<Club>,
    @InjectRepository(Membership) private membershipRepo: Repository<Membership>,
  ) {}

  async findById(id: string) {
    const club = await this.clubRepo.findOne({ where: { id } });
    if (!club) throw new NotFoundException('Klub nije pronađen');
    return club;
  }

  async update(id: string, data: Partial<Club>) {
    await this.clubRepo.update(id, data);
    return this.findById(id);
  }

  async getMembers(clubId: string) {
    return this.membershipRepo.find({
      where: { clubId },
      relations: ['user'],
    });
  }

  async removeMember(clubId: string, userId: string) {
    await this.membershipRepo.delete({ clubId, userId });
  }
}
