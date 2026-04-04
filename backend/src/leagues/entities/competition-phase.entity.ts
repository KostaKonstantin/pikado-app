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

@Entity('competition_phases')
export class CompetitionPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'league_id' })
  leagueId: string;

  @ManyToOne(() => League, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'league_id' })
  league: League;

  @Column()
  name: string;

  /** 'round_robin' for Regular/Baraž/Top10; 'knockout' for Playoff */
  @Column({ type: 'varchar', default: 'round_robin', name: 'phase_type' })
  type: 'round_robin' | 'knockout';

  @Column({ name: 'phase_order' })
  phaseOrder: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'active' | 'completed';

  /** Player IDs enrolled in this phase (set when phase is started) */
  @Column({ type: 'jsonb', default: [], name: 'player_ids' })
  playerIds: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
