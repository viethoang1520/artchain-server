import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Auction,
  AuctionPainting,
  AuctionParticipant,
  BidHistory,
} from './entities';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuthModule } from '../auth/auth.module';
import { PaintingsModule } from '../paintings/paintings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Auction,
      AuctionPainting,
      AuctionParticipant,
      BidHistory,
    ]),
    AuthModule,
    PaintingsModule,
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService, TypeOrmModule],
})
export class AuctionsModule {}
