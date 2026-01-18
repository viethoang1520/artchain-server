import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Auction,
  AuctionPainting,
  AuctionParticipant,
  BidHistory,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Auction,
      AuctionPainting,
      AuctionParticipant,
      BidHistory,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class AuctionsModule {}
