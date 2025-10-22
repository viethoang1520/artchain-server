import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';
import { Contest } from './entities/contests.entity';
import { AuthModule } from '../auth/auth.module';
import { Round } from './entities/round.entity';
import { ContestExaminer } from './entities/contest-examiner.entity';
import { Examiner } from '../examiners/entities/examiners.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contest, Round, ContestExaminer, Examiner]),
    AuthModule,
  ],
  controllers: [ContestsController],
  providers: [ContestsService],
  exports: [ContestsService],
})
export class ContestsModule {}
