import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';
import { Contest } from './entities/contests.entity';
import { AuthModule } from '../auth/auth.module';
import { Round } from './entities/round.entity';
import { ContestExaminer } from './entities/contest-examiner.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { User } from '../users/entities/user.entity';
import { Schedule } from '../schedules/entities/schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contest, Round, ContestExaminer, Examiner, User, Schedule]),
    AuthModule,
  ],
  controllers: [ContestsController],
  providers: [ContestsService],
  exports: [ContestsService],
})
export class ContestsModule {}
