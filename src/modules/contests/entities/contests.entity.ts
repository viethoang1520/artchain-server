import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('contests')
export class Contest {
  @PrimaryGeneratedColumn({ name: 'contest_id' })
  contestId: number;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({ name: 'num_of_award', nullable: true })
  numOfAward: number;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'created_by' })
  createdBy: number;
}
