import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExaminersController } from './examiners.controller';
import { Examiner } from './entities/examiners.entity';
import { AuthModule } from '../auth/auth.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { ExaminersService } from './examiners.service';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Examiner, ContestExaminer]),
    AuthModule,
    UsersModule,
    forwardRef(() => SchedulesModule),
  ],
  controllers: [ExaminersController],
  providers: [ExaminersService],
  exports: [ExaminersService],
})
export class ExaminersModule {}
