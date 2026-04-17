import { Module } from '@nestjs/common';
import { StaffService } from './staffs.service';
import { StaffController } from './staffs.controller';
import { AuthModule } from '../auth/auth.module';
import { PostsModule } from '../posts/posts.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { WalletsModule } from '../wallets/wallets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { ContestsModule } from '../contests/contests.module';
import { PaintingsModule } from '../paintings/paintings.module';
import { ExaminersModule } from '../examiners/examiners.module';

@Module({
  imports: [
    AuthModule,
    PostsModule,
    ContestsModule,
    CampaignsModule,
    FirebaseModule,
    PaintingsModule,
    ExaminersModule,
    WalletsModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
