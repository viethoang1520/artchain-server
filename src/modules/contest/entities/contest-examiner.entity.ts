import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Contest } from './contest.entity';
import { Examiner } from '../../examiner/entities/examiner.entity';

@Entity('contestexaminer')
export class ContestExaminer {
  @PrimaryColumn({ name: 'contest_id' })
  contestId: number;

  @PrimaryColumn({ name: 'examiner_id' })
  examinerId: number;

  @Column({ name: 'assignment_date', nullable: true })
  assignmentDate: Date;

  @Column({ name: 'status', nullable: true })
  status: string;

  @Column({ name: 'role', nullable: true })
  role: string;

  @ManyToOne(() => Contest)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @ManyToOne(() => Examiner)
  @JoinColumn({ name: 'examiner_id' })
  examiner: Examiner;
}
