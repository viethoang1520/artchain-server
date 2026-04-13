import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';
import { ContestCronService } from './contest-cron.service';
import { Contest } from './entities/contests.entity';
import { AuthModule } from '../auth/auth.module';
import { Round } from './entities/round.entity';
import { FirebaseModule } from '../firebase/firebase.module';
import { PaintingsModule } from '../paintings/paintings.module';
import { ExaminersModule } from '../examiners/examiners.module';
import { CompetitorsModule } from '../competitors/competitors.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { AwardsModule } from '../awards/awards.module';
import { ContestsRoundsService } from './contests-rounds.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contest, Round]),
    AuthModule,
    FirebaseModule,
    PaintingsModule,
    ExaminersModule,
    CompetitorsModule,
    SchedulesModule,
    AwardsModule,
  ],
  controllers: [ContestsController],
  providers: [ContestsService, ContestCronService, ContestsRoundsService],
  exports: [ContestsService],
})
export class ContestsModule {}
