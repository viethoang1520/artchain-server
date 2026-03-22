import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Auction } from './auction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('auction_participants')
export class AuctionParticipant {
  @PrimaryGeneratedColumn({ name: 'participant_id' })
  participantId: number;

  @Column({ name: 'auction_id', nullable: false })
  auctionId: number;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  @CreateDateColumn({ type: 'timestamp', name: 'join_time' })
  joinTime: Date;

  @ManyToOne(() => Auction, (auction) => auction.auctionParticipants)
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
