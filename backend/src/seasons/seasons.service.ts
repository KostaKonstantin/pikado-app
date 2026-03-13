import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Season } from './entities/season.entity';

@Injectable()
export class SeasonsService {
  constructor(@InjectRepository(Season) private seasonRepo: Repository<Season>) {}

  async findAll(clubId: string) {
    return this.seasonRepo.find({ where: { clubId }, order: { createdAt: 'DESC' } });
  }

  async findOne(clubId: string, id: string) {
    const s = await this.seasonRepo.findOne({ where: { id, clubId } });
    if (!s) throw new NotFoundException('Sezona nije pronađena');
    return s;
  }

  async create(clubId: string, data: Partial<Season>) {
    const season = this.seasonRepo.create({ ...data, clubId });
    return this.seasonRepo.save(season);
  }

  async update(clubId: string, id: string, data: Partial<Season>) {
    await this.findOne(clubId, id);
    await this.seasonRepo.update({ id, clubId }, data);
    return this.findOne(clubId, id);
  }

  async setActive(clubId: string, id: string) {
    await this.seasonRepo.update({ clubId }, { isActive: false });
    await this.seasonRepo.update({ id, clubId }, { isActive: true });
    return this.findOne(clubId, id);
  }
}
