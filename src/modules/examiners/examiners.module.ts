import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExaminersController } from './examiners.controller';
import { Examiner } from './entities/examiners.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { ExaminersService } from './examiners.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Examiner, User]),
    AuthModule,
    SchedulesModule,
  ],
  controllers: [ExaminersController],
  providers: [ExaminersService],
  exports: [ExaminersService],
})
export class ExaminersModule {}
