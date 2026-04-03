import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftController } from './nft.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Painting } from '../paintings/entities/paintings.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Nft } from './entities/nft.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nft, Painting, Competitor])],
  controllers: [NftController],
  providers: [NftService],
})
export class NftModule {}
