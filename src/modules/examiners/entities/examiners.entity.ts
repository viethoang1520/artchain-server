import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('examiners')
export class Examiner {
  @PrimaryGeneratedColumn({ name: 'examiner_id' })
  examinerId: number;

  @Column({ name: 'specialization', nullable: true })
  specialization: string;

  @Column({ name: 'assigned_schedule_id', nullable: true })
  assignedScheduleId: number;

  @OneToOne(() => User, (user) => user.examiner)
  @JoinColumn({ name: 'userId' })
  user: User;
}
