import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Club } from '../../clubs/entities/club.entity';
import { ClubRole } from '../../common/enums';

@Entity('memberships')
@Unique(['userId', 'clubId'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'club_id' })
  clubId: string;

  @Column({ type: 'enum', enum: ClubRole, default: ClubRole.VIEWER })
  role: ClubRole;

  @ManyToOne(() => User, (u) => u.memberships)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Club, (c) => c.memberships)
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
