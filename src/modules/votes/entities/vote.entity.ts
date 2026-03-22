import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Painting } from '../../paintings/entities/paintings.entity';
import { Award } from '../../awards/entities/award.entity';
import { Contest } from '../../contests/entities/contests.entity';
import { User } from '../../users/entities/user.entity';

@Entity('votes')
export class Vote {
  @PrimaryGeneratedColumn({ name: 'vote_id' })
  voteId: number;

  @Column({ name: 'painting_id', type: 'uuid' })
  paintingId: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @Column({ name: 'award_id', nullable: true })
  awardId: number;

  @Column({ name: 'contest_id' })
  contestId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.votes)
  @JoinColumn({ name: 'account_id' })
  user: User;

  @ManyToOne(() => Painting)
  @JoinColumn({ name: 'painting_id' })
  painting: Painting;

  @ManyToOne(() => Award, { nullable: true })
  @JoinColumn({ name: 'award_id' })
  award: Award;

  @ManyToOne(() => Contest)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;
}
