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

  @Column({ name: 'examiner_id', type: 'uuid' })
  examinerId: string;

  // Round 1 score - Simple scoring
  @Column({ type: 'int', nullable: true, name: 'score' })
  scoreRound1: number;

  // Round 2 score - Detailed scoring with criteria
  @Column({ type: 'int', nullable: true, name: 'score_round_2' })
  scoreRound2: number;

  // Creativity & Originality - Max 30 points (Round 2 only)
  @Column({ type: 'int', nullable: true, name: 'creativity_score' })
  creativityScore: number;

  // Composition - Max 20 points (Round 2 only)
  @Column({ type: 'int', nullable: true, name: 'composition_score' })
  compositionScore: number;

  // Color & Technique - Max 20 points (Round 2 only)
  @Column({ type: 'int', nullable: true, name: 'color_score' })
  colorScore: number;

  // Relevance to Theme - Max 20 points (Round 2 only)
  @Column({ type: 'int', nullable: true, name: 'technical_score' })
  technicalScore: number;

  // Overall Aesthetic - Max 10 points (Round 2 only)
  @Column({ type: 'int', nullable: true, name: 'aesthetic_score' })
  aestheticScore: number;

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

  @ManyToOne(() => Painting, (painting) => painting.evaluations)
  @JoinColumn({ name: 'painting_id' })
  painting: Painting;

  @ManyToOne(() => Examiner, (examiner) => examiner.evaluations)
  @JoinColumn({ name: 'examiner_id' })
  examiner: Examiner;
}
