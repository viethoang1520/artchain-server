import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [AiController],
  providers: [AiService],
  imports: [ConfigModule],
  exports: [AiService],
})
export class AiModule {}
