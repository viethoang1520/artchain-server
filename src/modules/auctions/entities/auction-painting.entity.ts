import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Auction } from './auction.entity';
import { Painting } from '../../paintings/entities/paintings.entity';
import { User } from '../../users/entities/user.entity';
import { BidHistory } from './bid-history.entity';

@Entity('auction_paintings')
@Index('idx_auction_paintings_painting_id', ['paintingId'])
export class AuctionPainting {
  @PrimaryGeneratedColumn({ name: 'auction_painting_id' })
  auctionPaintingId: number;

  @Column({ name: 'auction_id', nullable: false })
  auctionId: number;

  @Column({ name: 'painting_id', nullable: false })
  paintingId: string;

  @Column({
    type: 'int',
    name: 'auction_duration_minutes',
    nullable: true,
    comment: 'Thời gian đấu giá cho bức tranh (phút)',
  })
  auctionDurationMinutes: number | null;

  @Column({
    type: 'bigint',
    name: 'base_price',
    nullable: false,
    comment: 'Giá khởi điểm đấu giá',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  basePrice: number;

  @Column({
    type: 'bigint',
    name: 'ceil_price',
    nullable: true,
    comment: 'Giá trần (tùy chọn)',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseInt(value, 10) : null),
    },
  })
  ceilPrice: number | null;

  @Column({
    type: 'bigint',
    name: 'bid_step',
    default: 0,
    comment: 'Bước giá tối thiểu cho mỗi lần đặt giá',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  bidStep: number;

  @Column({
    type: 'bigint',
    name: 'current_bid',
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseInt(value, 10) : null),
    },
  })
  currentBid: number | null;

  @Column({ name: 'current_bidder_id', type: 'uuid', nullable: true })
  currentBidderId: string | null;

  @Column({
    type: 'boolean',
    name: 'is_sold',
    default: false,
  })
  isSold: boolean;

  @Column({
    type: 'int',
    name: 'revoked',
    default: 0,
  })
  revoked: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Auction, (auction) => auction.auctionPaintings)
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @ManyToOne(() => Painting, (painting) => painting.auctionPaintings, {
    eager: true,
  })
  @JoinColumn({ name: 'painting_id' })
  painting: Painting;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'current_bidder_id' })
  currentBidder: User | null;

  @OneToMany(() => BidHistory, (bidHistory) => bidHistory.auctionPainting)
  bidHistories: BidHistory[];
}
