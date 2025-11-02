import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
