import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn()
  round_id: number;

  @Column()
  contest_id: number;

  @Column({ nullable: true })
  table: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  submission_deadline: Date;

  @Column({ type: 'timestamp', nullable: true })
  result_announce_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  send_original_deadline: Date;

  @Column({ default: 'draft' })
  status: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
