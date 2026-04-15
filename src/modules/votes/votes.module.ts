import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { Vote } from './entities/vote.entity';
import { AuthModule } from '../auth/auth.module';
import { PaintingsModule } from '../paintings/paintings.module';
import { ContestsModule } from '../contests/contests.module';
import { AwardsModule } from '../awards/awards.module';
import { CompetitorsModule } from '../competitors/competitors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vote]),
    AuthModule,
    PaintingsModule,
    ContestsModule,
    AwardsModule,
    CompetitorsModule,
  ],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
