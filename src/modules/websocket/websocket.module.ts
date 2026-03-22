import { Module } from '@nestjs/common';
import { AuctionGateway, Exhibition3DGateway } from './gateways';
import { AuthModule } from '../auth/auth.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { AuctionSocketDocsController } from './auction-socket-docs.controller';

@Module({
  imports: [AuthModule, AuctionsModule],
  controllers: [AuctionSocketDocsController],
  providers: [Exhibition3DGateway, AuctionGateway],
})
export class WebsocketModule {}
