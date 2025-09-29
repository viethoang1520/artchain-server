import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Competitor } from '../../competitor/entities/competitor.entity';
import { Examiner } from '../../examiner/entities/examiner.entity';

export enum UserRole {
  COMPETITOR = 'COMPETITOR',
  EXAMINER = 'EXAMINER',
  ADMIN = 'USER',
}

export enum UserStatus {
  ACTIVE = 1,
  INACTIVE = 0,
}

@Entity('account')
export class User {
  @PrimaryGeneratedColumn({ name: 'account_id' })
  accountId: number;

  @Column({ name: 'username', unique: true })
  username: string;

  @Column({ name: 'password' })
  password: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'phone', nullable: true })
  phone: string;

  @Column({ name: 'role', type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'status', type: 'int', default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({ name: 'position_level', nullable: true })
  positionLevel: string;

  @OneToOne(() => Competitor, (competitor) => competitor.account, {
    nullable: true,
  })
  competitor: Competitor;

  @OneToOne(() => Examiner, (examiner) => examiner.account, { nullable: true })
  examiner: Examiner;
}
