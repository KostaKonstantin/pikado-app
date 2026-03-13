import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('rankings')
@Unique(['clubId', 'playerId', 'seasonId'])
export class Ranking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'club_id' })
  clubId: string;

  @Column({ name: 'player_id' })
  playerId: string;

  @Column({ name: 'season_id', nullable: true })
  seasonId: string;

  @Column({ default: 0 })
  points: number;

  @Column({ name: 'matches_played', default: 0 })
  matchesPlayed: number;

  @Column({ name: 'matches_won', default: 0 })
  matchesWon: number;

  @Column({ name: 'matches_lost', default: 0 })
  matchesLost: number;

  @Column({ name: 'matches_drawn', default: 0 })
  matchesDrawn: number;

  @Column({ name: 'sets_won', default: 0 })
  setsWon: number;

  @Column({ name: 'sets_lost', default: 0 })
  setsLost: number;

  @Column({ name: 'win_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  winRate: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
