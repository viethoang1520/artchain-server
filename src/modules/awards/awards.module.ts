import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwardsService } from './awards.service';
import { AwardsController } from './awards.controller';
import { Award } from './entities/award.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Award, Contest, Painting]), AuthModule],
  controllers: [AwardsController],
  providers: [AwardsService],
  exports: [AwardsService],
})
export class AwardsModule {}
