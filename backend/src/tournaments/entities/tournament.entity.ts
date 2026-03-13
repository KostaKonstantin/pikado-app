import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TournamentFormat, TournamentStatus } from '../../common/enums';
import { TournamentPlayer } from './tournament-player.entity';

@Entity('tournaments')
export class Tournament {
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

  @Column({
    type: 'enum',
    enum: TournamentFormat,
    default: TournamentFormat.SINGLE_ELIMINATION,
  })
  format: TournamentFormat;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status: TournamentStatus;

  @Column({ name: 'sets_to_win', default: 1 })
  setsToWin: number;

  @Column({ name: 'legs_per_set', default: 3 })
  legsPerSet: number;

  @Column({ name: 'starting_score', default: 501 })
  startingScore: number;

  @Column({ name: 'bracket_data', type: 'jsonb', nullable: true })
  bracketData: any;

  @Column({ name: 'group_count', nullable: true })
  groupCount: number;

  @Column({ name: 'qr_code_url', nullable: true })
  qrCodeUrl: string;

  @OneToMany(() => TournamentPlayer, (tp) => tp.tournament)
  tournamentPlayers: TournamentPlayer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
