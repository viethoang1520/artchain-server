import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';
import { ContestCronService } from './contest-cron.service';
import { Contest } from './entities/contests.entity';
import { AuthModule } from '../auth/auth.module';
import { Round } from './entities/round.entity';
import { ContestExaminer } from './entities/contest-examiner.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { User } from '../users/entities/user.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Award } from '../awards/entities/award.entity';
import { Painting } from '../paintings/entities/paintings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contest,
      Round,
      ContestExaminer,
      Examiner,
      User,
      Schedule,
      Award,
      Painting
    ]),
    AuthModule,
  ],
  controllers: [ContestsController],
  providers: [ContestsService, ContestCronService],
  exports: [ContestsService],
})
export class ContestsModule {}
