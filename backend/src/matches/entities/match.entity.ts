import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MatchStatus } from '../../common/enums';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id', nullable: true })
  tournamentId: string;

  @Column({ name: 'league_id', nullable: true })
  leagueId: string;

  @Column()
  round: number;

  @Column({ name: 'match_number' })
  matchNumber: number;

  @Column({ name: 'player1_id', nullable: true })
  player1Id: string;

  @Column({ name: 'player2_id', nullable: true })
  player2Id: string;

  @Column({ name: 'player1_score', default: 0 })
  player1Score: number;

  @Column({ name: 'player2_score', default: 0 })
  player2Score: number;

  @Column({ name: 'winner_id', nullable: true })
  winnerId: string;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PENDING })
  status: MatchStatus;

  @Column({ name: 'is_bye', default: false })
  isBye: boolean;

  @Column({ name: 'next_match_id', nullable: true })
  nextMatchId: string;

  @Column({ name: 'next_match_slot', nullable: true })
  nextMatchSlot: number;

  @Column({ name: 'loser_next_match_id', nullable: true })
  loserNextMatchId: string;

  @Column({ name: 'loser_next_match_slot', nullable: true })
  loserNextMatchSlot: number;

  @Column({ name: 'bracket_side', nullable: true })
  bracketSide: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
