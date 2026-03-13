import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { Player } from '../../players/entities/player.entity';

@Entity('tournament_players')
@Unique(['tournamentId', 'playerId'])
export class TournamentPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id' })
  tournamentId: string;

  @Column({ name: 'player_id' })
  playerId: string;

  @Column({ nullable: true })
  seed: number;

  @Column({ name: 'group_number', nullable: true })
  groupNumber: number;

  @Column({ name: 'is_bye', default: false })
  isBye: boolean;

  @ManyToOne(() => Tournament, (t) => t.tournamentPlayers)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;
}
