import { Module } from '@nestjs/common';
import { GuardiansService } from './guardians.service';
import { GuardiansController } from './guardians.controller';
import { AuthModule } from '../auth/auth.module';
import { Type } from 'class-transformer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competitor } from '../competitors/entities/competitors.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Competitor])],
  controllers: [GuardiansController],
  providers: [GuardiansService],
})
export class GuardiansModule {}
