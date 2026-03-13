import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LeagueStatus, LeagueFormat } from '../../common/enums';
import { LeaguePlayer } from './league-player.entity';
import { LeagueMatch } from './league-match.entity';

@Entity('leagues')
export class League {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'club_id' })
  clubId: string;

  @Column({ name: 'season_id', nullable: true })
  seasonId: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'enum', enum: LeagueFormat, default: LeagueFormat.SINGLE })
  format: LeagueFormat;

  @Column({ name: 'points_win', default: 2 })
  pointsWin: number;

  @Column({ name: 'points_draw', default: 1 })
  pointsDraw: number;

  @Column({ name: 'points_loss', default: 0 })
  pointsLoss: number;

  @Column({ name: 'sets_per_match', default: 1 })
  setsPerMatch: number;

  @Column({ name: 'legs_per_set', default: 3 })
  legsPerSet: number;

  @Column({ name: 'starting_score', default: 501 })
  startingScore: number;

  @Column({ type: 'enum', enum: LeagueStatus, default: LeagueStatus.DRAFT })
  status: LeagueStatus;

  @OneToMany(() => LeaguePlayer, (lp) => lp.league)
  leaguePlayers: LeaguePlayer[];

  @OneToMany(() => LeagueMatch, (lm) => lm.league)
  leagueMatches: LeagueMatch[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
