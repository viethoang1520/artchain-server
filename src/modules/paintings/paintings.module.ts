import { Module } from '@nestjs/common';
import { PaintingsService } from './paintings.service';
import { PaintingsController } from './paintings.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Painting } from './entities/paintings.entity';
import { Evaluation } from './entities/evaluation.entity';
import { User } from '../users/entities/user.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { Round } from '../contests/entities/round.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Award } from '../awards/entities/award.entity';

@Module({
  imports: [
    FirebaseModule,
    TypeOrmModule.forFeature([
      Painting,
      Evaluation,
      User,
      ContestExaminer,
      Round,
      Competitor,
      Award,
    ]),
  ],
  controllers: [PaintingsController],
  providers: [PaintingsService],
})
export class PaintingsModule {}
