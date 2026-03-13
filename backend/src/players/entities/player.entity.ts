import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Club } from '../../clubs/entities/club.entity';

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'club_id' })
  clubId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  country: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Club, (c) => c.players)
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
