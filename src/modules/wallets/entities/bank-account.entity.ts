import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BankAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid', { name: 'bank_account_id' })
  bankAccountId: string;

  @Column({ name: 'account_id', type: 'uuid', nullable: false })
  accountId: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: false })
  bankName: string;

  @Column({
    name: 'account_number',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  accountNumber: string;

  @Column({
    name: 'account_holder_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  accountHolderName: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BankAccountStatus,
    default: BankAccountStatus.ACTIVE,
  })
  status: BankAccountStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'account_id' })
  user: User;
}
