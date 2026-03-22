import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Evaluation } from '../../paintings/entities/evaluation.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

@Entity('examiners')
export class Examiner {
  @PrimaryColumn({ name: 'examiner_id', type: 'uuid' })
  examinerId: string;

  @Column({ name: 'specialization', nullable: true })
  specialization: string;

  @Column({ name: 'assigned_schedule_id', nullable: true })
  assignedScheduleId: number;

  // Relationships
  @OneToOne(() => User, (user) => user.examiner)
  @JoinColumn({ name: 'examiner_id', referencedColumnName: 'userId' })
  user: User;

  @OneToMany(() => Evaluation, (evaluation) => evaluation.examiner)
  evaluations: Evaluation[];

  @OneToMany(() => Schedule, (schedule) => schedule.examiner)
  schedules: Schedule[];
}
