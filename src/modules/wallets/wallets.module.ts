import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
})
export class WalletsModule {}
