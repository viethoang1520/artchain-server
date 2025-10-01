import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum ContestStatus {
  UPCOMING = 'UPCOMING',
  DRAFT = 'DRAFT',
  ENDED = 'ENDED',
  COMPLETED = 'COMPLETED',
  ACTIVE = 'ACTIVE',
}

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
  status: ContestStatus;

  @Column({ name: 'created_by' })
  createdBy: string;
}
