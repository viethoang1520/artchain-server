import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contest } from '../../contests/entities/contests.entity';
import { Examiner } from './examiners.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn({ name: 'schedule_id' })
  scheduleId: number;

  @Column({ name: 'contest_id' })
  contestId: number;

  @Column({ name: 'examiner_id', type: 'uuid' })
  examinerId: string;

  @Column({ name: 'task', type: 'varchar', length: 255 })
  task: string;

  @Column({ name: 'round2_table', type: 'varchar', length: 1, nullable: true })
  round2Table?: string;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Contest, (contest) => contest.schedules)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @ManyToOne(() => Examiner, (examiner) => examiner.schedules)
  @JoinColumn({ name: 'examiner_id' })
  examiner: Examiner;
}
