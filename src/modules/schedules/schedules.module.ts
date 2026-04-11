import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { User } from '../users/entities/user.entity';
import { Schedule } from './entities/schedule.entity';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      User,
      Contest,
      ContestExaminer,
      Examiner,
    ]),
  ],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
