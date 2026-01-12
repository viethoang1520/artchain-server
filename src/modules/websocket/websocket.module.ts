import { Module } from '@nestjs/common';
import { AuctionGateway, Exhibition3DGateway } from './gateways';

@Module({
  providers: [Exhibition3DGateway, AuctionGateway],
})
export class WebsocketModule {}
