import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PushToken } from '../../notifications/entities';
import { Competitor } from '../../competitors/entities/competitors.entity';
import { Examiner } from '../../examiners/entities/examiners.entity';
import { Contest } from '../../contests/entities/contests.entity';
import { Auction } from '../../auctions/entities/auction.entity';
import { Notifications } from '../../notifications/entities/notification.entity';
import { Post } from '../../posts/entities/post.entity';
import { Vote } from '../../votes/entities/vote.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { AuctionPainting } from '../../auctions/entities/auction-painting.entity';
import { BidHistory } from '../../auctions/entities/bid-history.entity';
import { AuctionParticipant } from '../../auctions/entities/auction-participant.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Order } from '../../orders/entities/order.entity';
import { Transaction } from '../../payments/entities/transaction.entity';

export enum UserRole {
  COMPETITOR = 'COMPETITOR',
  EXAMINER = 'EXAMINER',
  ADMIN = 'ADMIN',
  GUARDIAN = 'GUARDIAN',
  STAFF = 'STAFF',
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

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({
    name: 'email_verification_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  emailVerificationTokenHash: string | null;

  @Column({
    name: 'email_verification_token_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  emailVerificationTokenExpiresAt: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({ name: 'position_level', nullable: true })
  positionLevel: string;

  @OneToMany(() => PushToken, (token) => token.user)
  pushTokens: PushToken[];

  @OneToMany(() => Campaign, (campaign) => campaign.staff)
  campaigns: Campaign[];

  @OneToMany(() => Competitor, (competitor) => competitor.guardian)
  guardedCompetitors: Competitor[];

  @OneToMany(
    () => AuctionPainting,
    (auctionPainting) => auctionPainting.currentBidder,
  )
  currentBids: AuctionPainting[];

  @OneToMany(() => BidHistory, (bidHistory) => bidHistory.bidder)
  bidHistories: BidHistory[];

  @OneToMany(() => AuctionParticipant, (participant) => participant.user)
  auctionParticipations: AuctionParticipant[];

  @OneToMany(() => Notifications, (notification) => notification.user)
  notifications: Notifications[];

  // Role-based relationships
  @OneToOne(() => Competitor, (competitor) => competitor.user, {
    nullable: true,
  })
  competitor: Competitor;

  @OneToOne(() => Examiner, (examiner) => examiner.user, { nullable: true })
  examiner: Examiner;

  // Created content relationships
  @OneToMany(() => Contest, (contest) => contest.creator)
  createdContests: Contest[];

  @OneToMany(() => Auction, (auction) => auction.auctioneer)
  createdAuctions: Auction[];

  @OneToMany(() => Post, (post) => post.creator)
  createdPosts: Post[];

  @OneToMany(() => Vote, (vote) => vote.user)
  votes: Vote[];

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];
}
