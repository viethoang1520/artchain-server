import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Wallet } from './wallet.entity';
import { BankAccount } from './bank-account.entity';

export enum WalletWithdrawRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('wallet_withdraw_requests')
export class WalletWithdrawRequest {
  @PrimaryGeneratedColumn('uuid', { name: 'request_id' })
  requestId: string;

  @Column({ name: 'account_id', type: 'uuid', nullable: false })
  accountId: string;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: false })
  walletId: string;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: false })
  bankAccountId: string;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: WalletWithdrawRequestStatus,
    default: WalletWithdrawRequestStatus.PENDING,
  })
  status: WalletWithdrawRequestStatus;

  @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: false })
  bankName: string;

  @Column({
    name: 'recipient_bank_account_number',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  recipientBankAccountNumber: string;

  @Column({
    name: 'recipient_bank_account_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  recipientBankAccountName: string;


  @Column({ name: 'proof_image_url', type: 'text', nullable: true })
  proofImageUrl: string | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({ name: 'staff_note', type: 'text', nullable: true })
  staffNote: string | null;

  @Column({ name: 'processed_by', type: 'uuid', nullable: true })
  processedBy: string | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'account_id' })
  account: User;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @ManyToOne(() => BankAccount)
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount: BankAccount;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  staff: User | null;
}
