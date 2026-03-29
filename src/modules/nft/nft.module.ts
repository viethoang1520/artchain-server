import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftController } from './nft.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [NftController],
  providers: [NftService],
  imports: [HttpModule],
})
export class NftModule {}
