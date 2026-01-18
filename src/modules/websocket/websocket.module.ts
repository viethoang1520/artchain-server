import { Module } from '@nestjs/common';
import { AuctionGateway, Exhibition3DGateway } from './gateways';
import { AuthModule } from '../auth/auth.module';
import { AuctionsModule } from '../auctions/auctions.module';

@Module({
  imports: [AuthModule, AuctionsModule],
  providers: [Exhibition3DGateway, AuctionGateway],
})
export class WebsocketModule {}
