import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Club } from '../../clubs/entities/club.entity';

export enum InviteStatus {
  PENDING   = 'pending',
  ACCEPTED  = 'accepted',
  CANCELLED = 'cancelled',
  EXPIRED   = 'expired',
}

@Entity('invites')
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ name: 'club_id' })
  clubId: string;

  @Column({ type: 'enum', enum: InviteStatus, default: InviteStatus.PENDING })
  status: InviteStatus;

  @Column({ unique: true })
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @ManyToOne(() => Club, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
