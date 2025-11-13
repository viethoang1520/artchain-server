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
  @PrimaryGeneratedColumn({ name: 'token_id' })
  tokenId: number;

  @Column({ name: 'token_value', nullable: false })
  tokenValue: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'uuid', name: 'account_id', nullable: false })
  accountId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'account_id' })
  user: User;
}
