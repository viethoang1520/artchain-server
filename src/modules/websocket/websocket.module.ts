import { Module } from '@nestjs/common';
import { AuctionGateway, Exhibition3DGateway } from './gateways';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [Exhibition3DGateway, AuctionGateway],
})
export class WebsocketModule {}
