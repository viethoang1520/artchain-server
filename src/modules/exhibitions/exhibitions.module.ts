import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExhibitionsService } from './exhibitions.service';
import { ExhibitionsController } from './exhibitions.controller';
import { Exhibition } from './entities/exhibition.entity';
import { ExhibitionPainting } from './entities/exhibition-painting.entity';
import { Painting } from '../paintings/entities/paintings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exhibition, ExhibitionPainting, Painting]),
  ],
  controllers: [ExhibitionsController],
  providers: [ExhibitionsService],
  exports: [ExhibitionsService],
})
export class ExhibitionsModule {}
