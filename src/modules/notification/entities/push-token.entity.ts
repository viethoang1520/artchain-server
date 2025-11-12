import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn()
  token_id: number;

  @Column({ name: 'token_value', nullable: false })
  token_value: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'uuid', name: 'account_id', nullable: false })
  account_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'account_id' })
  user: User;
}
