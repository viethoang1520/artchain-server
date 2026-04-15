import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';
import { PaintingsModule } from '../paintings/paintings.module';

@Module({
  controllers: [AiController],
  providers: [AiService],
  imports: [ConfigModule, forwardRef(() => PaintingsModule)],
  exports: [AiService],
})
export class AiModule { }
