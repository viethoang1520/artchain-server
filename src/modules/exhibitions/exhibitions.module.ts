import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExhibitionsService } from './exhibitions.service';
import { ExhibitionsController } from './exhibitions.controller';
import { Exhibition } from './entities/exhibition.entity';
import { ExhibitionPainting } from './entities/exhibition-painting.entity';
import { PaintingsModule } from '../paintings/paintings.module';
import { CompetitorsModule } from '../competitors/competitors.module';
import { AwardsModule } from '../awards/awards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exhibition, ExhibitionPainting]),
    PaintingsModule,
    CompetitorsModule,
    AwardsModule,
  ],
  controllers: [ExhibitionsController],
  providers: [ExhibitionsService],
  exports: [ExhibitionsService],
})
export class ExhibitionsModule {}
