import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftController } from './nft.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nft } from '../paintings/entities/nft.entity';
import { Painting } from '../paintings/entities/paintings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nft, Painting])],
  controllers: [NftController],
  providers: [NftService],
})
export class NftModule {}
