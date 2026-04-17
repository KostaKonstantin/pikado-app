import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('share_tokens')
export class ShareToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'league_id' })
  leagueId: string;

  @Column({ unique: true })
  @Index()
  token: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
