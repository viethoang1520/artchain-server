import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { Vote } from './entities/vote.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Award } from '../awards/entities/award.entity';
import { Round } from '../contests/entities/round.entity';
import { AuthModule } from '../auth/auth.module';
import { Competitor } from '../competitors/entities/competitors.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vote, Painting, Contest, Award, Round, Competitor, User]),
    AuthModule,
  ],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
