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
import { Sponsor } from './modules/sponsors/entities/sponsor.entity';
import { SponsorsModule } from './modules/sponsors/sponsors.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
