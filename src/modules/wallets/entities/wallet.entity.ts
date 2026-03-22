import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FROZEN = 'FROZEN',
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn({ name: 'wallet_id' })
  walletId: number;

  @Column({ name: 'account_id', type: 'uuid', nullable: false })
  accountId: string;

  @Column({
    name: 'balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  balance: number;

  @Column({ name: 'currency', nullable: false, default: 'VND' })
  currency: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.wallets)
  @JoinColumn({ name: 'account_id' })
  user: User;
}
