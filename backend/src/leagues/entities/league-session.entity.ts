import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { League } from './league.entity';
import { LeagueMatch } from './league-match.entity';

@Entity('league_sessions')
export class LeagueSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'league_id' })
  leagueId: string;

  @Column({ name: 'session_number' })
  sessionNumber: number;

  @Column({ name: 'session_date', type: 'date', nullable: true })
  sessionDate: string | null;

  /** 'open' while matches are being played; 'closed' once the evening is done */
  @Column({ default: 'open' })
  status: string;

  /** IDs of players who are present this evening */
  @Column({ name: 'present_player_ids', type: 'jsonb', default: '[]' })
  presentPlayerIds: string[];

  /** Maximum matches any single player plays this session (default 2) */
  @Column({ name: 'max_matches_per_player', default: 2 })
  maxMatchesPerPlayer: number;

  @ManyToOne(() => League)
  @JoinColumn({ name: 'league_id' })
  league: League;

  @OneToMany(() => LeagueMatch, (m) => m.session)
  matches: LeagueMatch[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
