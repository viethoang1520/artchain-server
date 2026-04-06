import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FROZEN = 'FROZEN',
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid', { name: 'wallet_id' })
  walletId: string;

  @Column({ name: 'account_id', type: 'uuid', nullable: false, unique: true })
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
  @OneToOne(() => User)
  @JoinColumn({ name: 'account_id' })
  user: User;
}
