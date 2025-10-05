import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

import { AuthModule } from '../auth/auth.module';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Contest } from '../contests/entities/contests.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { ProfileController } from './profiles.controller';
import { ProfileService } from './profiles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Competitor,
      Examiner,
      Contest,
      ContestExaminer,
    ]),
    AuthModule
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule { }
