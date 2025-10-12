import { Module } from '@nestjs/common';
import { PaintingsService } from './paintings.service';
import { PaintingsController } from './paintings.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Painting } from './entities/paintings.entity';
import { Evaluation } from './entities/evaluation.entity';

@Module({
  imports: [FirebaseModule, TypeOrmModule.forFeature([Painting, Evaluation])],
  controllers: [PaintingsController],
  providers: [PaintingsService],
})
export class PaintingsModule {}
