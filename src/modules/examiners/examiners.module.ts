import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExaminersController } from './examiners.controller';
import { Examiner } from './entities/examiners.entity';
import { StaffModule } from '../staffs/staffs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Examiner]), StaffModule, AuthModule],
  controllers: [ExaminersController],
})
export class ExaminersModule {}
