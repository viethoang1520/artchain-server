import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffService } from './staffs.service';
import { StaffController } from './staffs.controller';
import { Contest } from '../contests/entities/contests.entity';
import { Round } from '../contests/entities/round.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { AuthModule } from '../auth/auth.module';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contest,
      Round,
      ContestExaminer,
      Examiner,
      Painting,
    ]),
    AuthModule,
    PostsModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule { }
