import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contest } from './contests.entity';

@Entity('evaluation_criteria')
export class EvaluationCriteria {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({
    name: 'max_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  maxScore: number;

  @Column({
    name: 'weight',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  weight: number;

  @Column({ name: 'contest_id' })
  contestId: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Contest, (contest) => contest.evaluationCriteria)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;
}
