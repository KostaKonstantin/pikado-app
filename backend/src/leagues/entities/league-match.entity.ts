import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { League } from './league.entity';
import { Player } from '../../players/entities/player.entity';
import { MatchStatus } from '../../common/enums';

@Entity('league_matches')
export class LeagueMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'league_id' })
  leagueId: string;

  @Column({ name: 'home_player_id' })
  homePlayerId: string;

  @Column({ name: 'away_player_id' })
  awayPlayerId: string;

  @Column({ name: 'home_sets', default: 0 })
  homeSets: number;

  @Column({ name: 'away_sets', default: 0 })
  awaySets: number;

  @Column({ name: 'home_legs', default: 0 })
  homeLegs: number;

  @Column({ name: 'away_legs', default: 0 })
  awayLegs: number;

  @Column({ name: 'winner_id', nullable: true })
  winnerId: string;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PENDING })
  status: MatchStatus;

  @Column({ name: 'round_number' })
  roundNumber: number;

  @Column({ name: 'session_number', default: 1 })
  sessionNumber: number;

  @Column({ name: 'match_order', default: 0 })
  matchOrder: number;

  @Column({ name: 'scheduled_date', type: 'timestamptz', nullable: true })
  scheduledDate: Date | null;

  @Column({ name: 'is_postponed', default: false })
  isPostponed: boolean;

  @Column({ nullable: true })
  slug: string;

  @ManyToOne(() => League, (l) => l.leagueMatches)
  @JoinColumn({ name: 'league_id' })
  league: League;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'home_player_id' })
  homePlayer: Player;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'away_player_id' })
  awayPlayer: Player;

  @Column({ name: 'played_at', nullable: true })
  playedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
