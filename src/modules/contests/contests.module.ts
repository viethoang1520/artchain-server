import { Module } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contest } from './entities/contests.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contest]),
  ],
  controllers: [ContestsController],
  providers: [ContestsService],
})
export class ContestsModule {}
