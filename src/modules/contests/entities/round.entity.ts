import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Contest } from './contests.entity';
import { Painting } from '../../paintings/entities/paintings.entity';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn({ name: 'round_id' })
  roundId: number;

  @Column({ name: 'contest_id' })
  contestId: number;

  @Column({ name: 'table', nullable: true })
  table?: string;

  @Column({ name: 'name', length: 255 })
  name: string;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ name: 'submission_deadline', type: 'timestamp', nullable: true })
  submissionDeadline?: Date;

  @Column({ name: 'result_announce_date', type: 'timestamp', nullable: true })
  resultAnnounceDate?: Date;

  @Column({ name: 'send_original_deadline', type: 'timestamp', nullable: true })
  sendOriginalDeadline?: Date;

  @Column({ name: 'status', default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Contest, (contest) => contest.rounds)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @OneToMany(() => Painting, (painting) => painting.round)
  paintings: Painting[];
}
