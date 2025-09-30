import { UUID } from 'crypto';
import { Competitor } from 'src/modules/competitors/entities/competitors.entity';
import { Examiner } from 'src/modules/examiners/entities/examiners.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';


export enum UserRole {
  COMPETITOR = 'COMPETITOR',
  EXAMINER = 'EXAMINER',
  ADMIN = 'USER',
  GUARDIAN = 'GUARDIAN',
}

export enum UserStatus {
  ACTIVE = 1,
  INACTIVE = 0,
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ name: 'username', unique: true, nullable: false })
  username: string;

  @Column({ name: 'password', nullable: false })
  password: string;

  @Column({ name: 'full_name', nullable: false })
  fullName: string;

  @Column({ name: 'email', unique: true, nullable: false })
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

}
