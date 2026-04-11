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
import { User } from '../users/entities/user.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { FirebaseModule } from '../firebase/firebase.module';
import { Award } from '../awards/entities/award.entity';
import { Evaluation } from '../paintings/entities/evaluation.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contest,
      Round,
      ContestExaminer,
      Examiner,
      Painting,
      User,
      Schedule,
      Competitor,
      Award,
      Evaluation,
    ]),
    AuthModule,
    PostsModule,
    CampaignsModule,
    FirebaseModule,
    WalletsModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
