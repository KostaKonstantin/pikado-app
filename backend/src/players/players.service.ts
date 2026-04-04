import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { CreatePlayerDto } from './dto/create-player.dto';
import { Match } from '../matches/entities/match.entity';
import { LeagueMatch } from '../leagues/entities/league-match.entity';
import { MatchStatus } from '../common/enums';

const AVATAR_SEEDS = [
  { dartType: 'classic', tipType: 'classic', flightType: 'standard', primaryColor: '#FF4D4D', secondaryColor: '#1A1A1A', pattern: 'solid'   },
  { dartType: 'slim',    tipType: 'needle',  flightType: 'slim',     primaryColor: '#4DA6FF', secondaryColor: '#0A0A23', pattern: 'stripe'  },
  { dartType: 'grip',    tipType: 'classic', flightType: 'kite',     primaryColor: '#4DFF88', secondaryColor: '#003322', pattern: 'split'   },
  { dartType: 'pro',     tipType: 'needle',  flightType: 'pro',      primaryColor: '#FFD24D', secondaryColor: '#332200', pattern: 'diamond' },
  { dartType: 'heavy',   tipType: 'heavy',   flightType: 'fantasy',  primaryColor: '#B84DFF', secondaryColor: '#220033', pattern: 'flame'   },
  { dartType: 'classic', tipType: 'classic', flightType: 'kite',     primaryColor: '#FF8C42', secondaryColor: '#331A00', pattern: 'stripe'  },
  { dartType: 'slim',    tipType: 'needle',  flightType: 'standard', primaryColor: '#2ED3B7', secondaryColor: '#003333', pattern: 'carbon'  },
  { dartType: 'grip',    tipType: 'classic', flightType: 'fantasy',  primaryColor: '#FF4D4D', secondaryColor: '#000000', pattern: 'flame'   },
  { dartType: 'pro',     tipType: 'needle',  flightType: 'slim',     primaryColor: '#4DA6FF', secondaryColor: '#111111', pattern: 'split'   },
  { dartType: 'heavy',   tipType: 'heavy',   flightType: 'pro',      primaryColor: '#FFD24D', secondaryColor: '#1A1A1A', pattern: 'carbon'  },
  { dartType: 'classic', tipType: 'classic', flightType: 'fantasy',  primaryColor: '#B84DFF', secondaryColor: '#0D001A', pattern: 'diamond' },
  { dartType: 'slim',    tipType: 'needle',  flightType: 'kite',     primaryColor: '#2ED3B7', secondaryColor: '#001A1A', pattern: 'stripe'  },
  { dartType: 'grip',    tipType: 'classic', flightType: 'standard', primaryColor: '#FF8C42', secondaryColor: '#1A0F00', pattern: 'solid'   },
  { dartType: 'pro',     tipType: 'needle',  flightType: 'fantasy',  primaryColor: '#4DFF88', secondaryColor: '#001A0D', pattern: 'flame'   },
  { dartType: 'heavy',   tipType: 'heavy',   flightType: 'kite',     primaryColor: '#FF4D4D', secondaryColor: '#330000', pattern: 'split'   },
];

function randomAvatarSeed() {
  return AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
}

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player) private playerRepo: Repository<Player>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(LeagueMatch) private leagueMatchRepo: Repository<LeagueMatch>,
  ) {}

  async findAll(clubId: string, search?: string) {
    const qb = this.playerRepo
      .createQueryBuilder('p')
      .where('p.clubId = :clubId', { clubId })
      .andWhere('p.isActive = true');

    if (search) {
      qb.andWhere('(p.fullName ILIKE :s OR p.nickname ILIKE :s)', { s: `%${search}%` });
    }

    return qb.orderBy('p.fullName', 'ASC').getMany();
  }

  async findOne(clubId: string, id: string) {
    const player = await this.playerRepo.findOne({ where: { id, clubId } });
    if (!player) throw new NotFoundException('Igrač nije pronađen');
    return player;
  }

  async create(clubId: string, dto: CreatePlayerDto) {
    const avatar = dto.avatar ?? randomAvatarSeed();
    const player = this.playerRepo.create({ ...dto, clubId, avatar });
    return this.playerRepo.save(player);
  }

  async update(clubId: string, id: string, dto: Partial<CreatePlayerDto>) {
    await this.findOne(clubId, id);
    await this.playerRepo.update({ id, clubId }, dto);
    return this.findOne(clubId, id);
  }

  async remove(clubId: string, id: string) {
    await this.findOne(clubId, id);
    await this.playerRepo.update({ id, clubId }, { isActive: false });
  }

  async getStats(clubId: string, playerId: string) {
    await this.findOne(clubId, playerId);

    const tournamentMatches = await this.matchRepo.find({
      where: [
        { player1Id: playerId, status: MatchStatus.COMPLETED },
        { player2Id: playerId, status: MatchStatus.COMPLETED },
      ],
    });

    const leagueMatches = await this.leagueMatchRepo.find({
      where: [
        { homePlayerId: playerId, status: MatchStatus.COMPLETED },
        { awayPlayerId: playerId, status: MatchStatus.COMPLETED },
      ],
    });

    let wins = 0, losses = 0, draws = 0;

    for (const m of tournamentMatches) {
      if (m.winnerId === playerId) wins++;
      else if (m.winnerId) losses++;
    }

    for (const m of leagueMatches) {
      if (m.winnerId === playerId) wins++;
      else if (m.winnerId === null && m.status === MatchStatus.COMPLETED) draws++;
      else if (m.winnerId) losses++;
    }

    const total = wins + losses + draws;
    return {
      matchesPlayed: total,
      wins,
      losses,
      draws,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  }

  async getHistory(clubId: string, playerId: string) {
    await this.findOne(clubId, playerId);

    const tournamentMatches = await this.matchRepo.find({
      where: [{ player1Id: playerId }, { player2Id: playerId }],
      order: { createdAt: 'DESC' },
    });

    const leagueMatches = await this.leagueMatchRepo.find({
      where: [{ homePlayerId: playerId }, { awayPlayerId: playerId }],
      relations: ['homePlayer', 'awayPlayer', 'league'],
      order: { createdAt: 'DESC' },
    });

    return { tournamentMatches, leagueMatches };
  }
}
