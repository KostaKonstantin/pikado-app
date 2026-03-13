import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { League } from './league.entity';
import { Player } from '../../players/entities/player.entity';

@Entity('league_players')
@Unique(['leagueId', 'playerId'])
export class LeaguePlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'league_id' })
  leagueId: string;

  @Column({ name: 'player_id' })
  playerId: string;

  @ManyToOne(() => League, (l) => l.leaguePlayers)
  @JoinColumn({ name: 'league_id' })
  league: League;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @CreateDateColumn({ name: 'enrolled_at' })
  enrolledAt: Date;
}
