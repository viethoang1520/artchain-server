import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffService } from './staffs.service';
import { StaffController } from './staffs.controller';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { AuthModule } from '../auth/auth.module';
import { PostsModule } from '../posts/posts.module';
import { User } from '../users/entities/user.entity';
import { FirebaseModule } from '../firebase/firebase.module';
import { WalletsModule } from '../wallets/wallets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { ContestsModule } from '../contests/contests.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Examiner, Painting, User]),
    AuthModule,
    PostsModule,
    ContestsModule,
    CampaignsModule,
    SchedulesModule,
    FirebaseModule,
    WalletsModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
