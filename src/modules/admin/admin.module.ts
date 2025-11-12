import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { Evaluation } from '../paintings/entities/evaluation.entity';
import { Vote } from '../votes/entities/vote.entity';
import { Award } from '../awards/entities/award.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Exhibition } from '../exhibitions/entities/exhibition.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Contest,
      Painting,
      Evaluation,
      Vote,
      Award,
      Competitor,
      Examiner,
      Exhibition,
      Campaign,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
