import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('examiners')
export class Examiner {
  @PrimaryColumn({ name: 'examiner_id' })
  examinerId: string;
  
  @Column({ name: 'specialization', nullable: true })
  specialization: string;

  @Column({ name: 'assigned_schedule_id', nullable: true })
  assignedScheduleId: number;
}
