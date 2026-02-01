import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuctionPainting } from './auction-painting.entity';
import { AuctionParticipant } from './auction-participant.entity';

export enum AuctionStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn({ name: 'auction_id' })
  auctionId: number;

  @Column({ type: 'varchar', length: 255, name: 'title', nullable: false })
  title: string;

  @Column({ type: 'timestamp', name: 'start_time', nullable: false })
  startTime: Date;

  @Column({ type: 'timestamp', name: 'end_time', nullable: false })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: AuctionStatus,
    name: 'status',
    default: AuctionStatus.PENDING,
  })
  status: AuctionStatus;

  @Column({ name: 'auctioneer_id', nullable: false })
  auctioneerId: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'auctioneer_id' })
  auctioneer: User;

  @OneToMany(
    () => AuctionPainting,
    (auctionPainting) => auctionPainting.auction,
  )
  auctionPaintings: AuctionPainting[];

  @OneToMany(() => AuctionParticipant, (participant) => participant.auction)
  auctionParticipants: AuctionParticipant[];
}
