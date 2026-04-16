import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ProfileModule } from './modules/profiles/profiles.module';
import { ContestsModule } from './modules/contests/contests.module';
import { PaintingsModule } from './modules/paintings/paintings.module';
import { AdminModule } from './modules/admin/admin.module';
import { StaffModule } from './modules/staffs/staffs.module';
import { PostsModule } from './modules/posts/posts.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { SponsorsModule } from './modules/sponsors/sponsors.module';
import { ExaminersModule } from './modules/examiners/examiners.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AwardsModule } from './modules/awards/awards.module';
import { ExhibitionsModule } from './modules/exhibitions/exhibitions.module';
import { EmailsModule } from './modules/emails/emails.module';
import { VotesModule } from './modules/votes/votes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { AiModule } from './modules/ai/ai.module';
import { NftModule } from './modules/nft/nft.module';
import { TiersModule } from './modules/tiers/tiers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProfileModule,
    ContestsModule,
    PaintingsModule,
    AdminModule,
    StaffModule,
    PostsModule,
    GuardiansModule,
    SponsorsModule,
    ExaminersModule,
    CampaignsModule,
    AwardsModule,
    ExhibitionsModule,
    EmailsModule,
    VotesModule,
    NotificationsModule,
    WebsocketModule,
    AuctionsModule,
    WalletsModule,
    AiModule,
    NftModule,
    TiersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
