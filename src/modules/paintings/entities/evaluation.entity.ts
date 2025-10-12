import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Painting } from './paintings.entity';
import { Examiner } from '../../examiners/entities/examiners.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'painting_id' })
  paintingId: string;

  @Column({ name: 'examiner_id' })
  examinerId: string;

  @Column({ type: 'int', name: 'score' })
  score: number;

  @Column({ type: 'text', nullable: true, name: 'feedback' })
  feedback: string;

  @Column({ type: 'timestamp', nullable: true, name: 'evaluation_date' })
  evaluationDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'PENDING', name: 'status' })
  status: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Painting)
  @JoinColumn({ name: 'painting_id' })
  painting: Painting;

  @ManyToOne(() => Examiner)
  @JoinColumn({ name: 'examiner_id' })
  examiner: Examiner;
}
