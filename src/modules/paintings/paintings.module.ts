import { Module } from '@nestjs/common';
import { PaintingsService } from './paintings.service';
import { PaintingsController } from './paintings.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { CompetitorsModule } from '../competitors/competitors.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Painting } from './entities/paintings.entity';

@Module({
  imports: [
    FirebaseModule,
    TypeOrmModule.forFeature([Painting]),
  ],
  controllers: [PaintingsController],
  providers: [PaintingsService],
})
export class PaintingsModule {}
  