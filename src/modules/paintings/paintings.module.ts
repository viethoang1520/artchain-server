import { Module, forwardRef } from '@nestjs/common';
import { PaintingsService } from './paintings.service';
import { PaintingsController } from './paintings.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Painting } from './entities/paintings.entity';
import { Evaluation } from './entities/evaluation.entity';

import { AiModule } from '../ai/ai.module';
import { Nft } from '../nft/entities/nft.entity';
import { CompetitorsModule } from '../competitors/competitors.module';
import { ExaminersModule } from '../examiners/examiners.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { AwardsModule } from '../awards/awards.module';
import { ContestsModule } from '../contests/contests.module';

@Module({
  imports: [
    FirebaseModule,
    AiModule,
    CompetitorsModule,
    ExaminersModule,
    SchedulesModule,
    forwardRef(() => AwardsModule),
    forwardRef(() => ContestsModule),
    TypeOrmModule.forFeature([Painting, Evaluation, Nft]),
  ],
  controllers: [PaintingsController],
  providers: [PaintingsService],
  exports: [PaintingsService],
})
export class PaintingsModule {}
