import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity('paintings')
export class Painting {
  @PrimaryGeneratedColumn('uuid', { name: 'painting_id' })
  paintingId: string;

  @Column({ nullable: true, name: 'round_id' })
  roundId: string;

  @Column({ nullable: true, name: 'award_id' }) 
  awardId: number;

  @Column({ nullable: true, name: 'contest_id' })
  contestId: number;

  @Column({ nullable: true, name: 'competitor_id' })
  competitorId: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string;

  @Column({ length: 255, name: 'title' })
  title: string;

  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'timestamp', nullable: true, name: 'submission_date' })
  submissionDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'pending', name: 'status' })
  status: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
