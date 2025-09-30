import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('competitor')
export class Competitor {
  @PrimaryColumn({ name: 'competitor_id' })
  competitorId: number;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'birthday', nullable: true })
  birthday: Date;

  @Column({ name: 'school_name', nullable: true })
  schoolName: string;

  @Column({ name: 'ward', nullable: true })
  ward: string;

  @Column({ name: 'grade', nullable: true })
  grade: string;

  @Column({ name: 'guardian_id', nullable: true })
  guardianId: number;

  @OneToOne(() => User, (user) => user.competitor)
  @JoinColumn({ name: 'competitorId', referencedColumnName: 'userId' })
  user: User;
}
