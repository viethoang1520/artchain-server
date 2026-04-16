import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftController } from './nft.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nft } from './entities/nft.entity';
import { PaintingsModule } from '../paintings/paintings.module';
import { CompetitorsModule } from '../competitors/competitors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Nft]),
    PaintingsModule,
    CompetitorsModule,
  ],
  controllers: [NftController],
  providers: [NftService],
})
export class NftModule {}
