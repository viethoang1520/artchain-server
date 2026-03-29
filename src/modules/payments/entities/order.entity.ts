import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderType {
  SPONSOR = 'SPONSOR',
  WALLET_TOPUP = 'WALLET_TOPUP',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  sponsorId: number;

  @Column({ nullable: true })
  walletId: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  orderCode: number;

  @Column({
    type: 'decimal', precision: 12, scale: 2, transformer: {
      to: (value: number) => value, 
      from: (value: string) => parseFloat(value), 
    },
  })
  amount: number;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  returnUrl: string;

  @Column({ type: 'varchar', length: 255 })
  cancelUrl: string;

  @Column({ type: 'varchar', length: 255 })
  transactionId: string;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.SPONSOR,
  })
  orderType: OrderType;

  @Column({ type: 'varchar', length: 50, default: OrderStatus.PENDING })
  status: string;
  @CreateDateColumn()
  createdAt: Date;
}
