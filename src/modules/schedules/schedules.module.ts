import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { SchedulesService } from './schedules.service';
import { UsersModule } from '../users/users.module';
import { ExaminersModule } from '../examiners/examiners.module';
import { ContestsModule } from '../contests/contests.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule]),
    UsersModule,
    forwardRef(() => ExaminersModule),
    forwardRef(() => ContestsModule),
  ],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
