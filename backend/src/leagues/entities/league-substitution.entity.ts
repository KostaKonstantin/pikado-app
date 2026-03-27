import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Player } from '../../players/entities/player.entity';

@Entity('league_substitutions')
export class LeagueSubstitution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'league_id' })
  leagueId: string;

  @Column({ name: 'absent_player_id' })
  absentPlayerId: string;

  @Column({ name: 'substitute_player_id' })
  substitutePlayerId: string;

  /** Evening number from which the substitution takes permanent effect */
  @Column({ name: 'applied_from_evening' })
  appliedFromEvening: number;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'absent_player_id' })
  absentPlayer: Player;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'substitute_player_id' })
  substitutePlayer: Player;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
