import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AuctionPainting } from './auction-painting.entity';
import { User } from '../../users/entities/user.entity';

@Entity('bid_histories')
export class BidHistory {
  @PrimaryGeneratedColumn({ name: 'bid_history_id' })
  bidHistoryId: number;

  @Column({ name: 'auction_painting_id', nullable: false })
  auctionPaintingId: number;

  @Column({ name: 'bidder_id', nullable: false })
  bidderId: string;

  @Column({
    type: 'bigint',
    name: 'bid_amount',
    nullable: false,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  bidAmount: number;

  @CreateDateColumn({ type: 'timestamp', name: 'bid_time' })
  bidTime: Date;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'status',
    default: 'ACTIVE',
    nullable: true,
  })
  status: string; 

  @ManyToOne(
    () => AuctionPainting,
    (auctionPainting) => auctionPainting.bidHistories,
  )
  @JoinColumn({ name: 'auction_painting_id' })
  auctionPainting: AuctionPainting;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'bidder_id' })
  bidder: User;
}
