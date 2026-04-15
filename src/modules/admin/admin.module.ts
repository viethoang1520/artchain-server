import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { ContestsModule } from '../contests/contests.module';
import { PaintingsModule } from '../paintings/paintings.module';
import { VotesModule } from '../votes/votes.module';
import { AwardsModule } from '../awards/awards.module';
import { CompetitorsModule } from '../competitors/competitors.module';
import { ExhibitionsModule } from '../exhibitions/exhibitions.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    UsersModule,
    ContestsModule,
    PaintingsModule,
    VotesModule,
    AwardsModule,
    CompetitorsModule,
    ExhibitionsModule,
    CampaignsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
