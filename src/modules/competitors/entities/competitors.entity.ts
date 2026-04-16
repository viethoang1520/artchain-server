import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Painting } from '../../paintings/entities/paintings.entity';

@Entity('competitors')
export class Competitor {
  @PrimaryColumn({ name: 'competitor_id', type: 'uuid' })
  competitorId: string;

  @Column({ name: 'birthday', nullable: true })
  birthday: Date;

  @Column({ name: 'school_name', nullable: true })
  schoolName: string;

  @Column({ name: 'ward', nullable: true })
  ward: string;

  @Column({ name: 'grade', nullable: true })
  grade: string;

  @Column({ name: 'guardian_id', type: 'uuid', nullable: true })
  guardianId: string;

  @ManyToOne(() => User, (user) => user.guardedCompetitors)
  @JoinColumn({ name: 'guardian_id' })
  guardian: User;

  // Relationships
  @OneToOne(() => User, (user) => user.competitor)
  @JoinColumn({ name: 'competitor_id', referencedColumnName: 'userId' })
  user: User;

  @OneToMany(() => Painting, (painting) => painting.competitor)
  paintings: Painting[];
}
