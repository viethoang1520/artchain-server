import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities';
import { User } from '../users/entities/user.entity';
import { WalletsController } from './wallet.controller';
import { WalletsService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, User])],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule { }
