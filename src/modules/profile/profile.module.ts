import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Competitor } from '../competitor/entities/competitor.entity';
import { Examiner } from '../examiner/entities/examiner.entity';
import { Contest } from '../contest/entities/contest.entity';
import { ContestExaminer } from '../contest/entities/contest-examiner.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthModule } from '../auth/auth.module';

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
export class ProfileModule {}
