import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Award } from '../../awards/entities/award.entity';
import { User } from '../../users/entities/user.entity';
import { Painting } from '../../paintings/entities/paintings.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { Round } from './round.entity';

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

  @Column({ name: 'banner_url', nullable: true })
  bannerUrl: string;

  @Column({ name: 'num_of_award', nullable: true })
  numOfAward: number;

  @Column({ name: 'round_2_quantity', nullable: true })
  round2Quantity: number;

  @Column({ name: 'number_of_tables_round_2', nullable: true })
  numberOfTablesRound2: number;

  @Column({
    name: 'is_schedule_enforced',
    nullable: true,
    default: false,
    comment:
      'Bật/tắt ràng buộc lịch chấm. true = examiner chỉ chấm đúng ngày, false = examiner chấm bất cứ lúc nào',
  })
  isScheduleEnforced: boolean;

  @Column({ name: 'rule', nullable: true })
  ruleUrl: string;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ name: 'status' })
  status: ContestStatus;

  @Column({ name: 'created_by' })
  createdBy: string;

  @OneToMany(() => Award, (award) => award.contest)
  awards: Award[];

  @OneToMany(() => Painting, (painting) => painting.contest)
  paintings: Painting[];

  @OneToMany(() => Schedule, (schedule) => schedule.contest)
  schedules: Schedule[];

  @OneToMany(() => Round, (round) => round.contest)
  rounds: Round[];

  @ManyToOne(() => User, (user) => user.createdContests)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
