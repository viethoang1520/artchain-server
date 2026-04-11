import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccount, Wallet, WalletWithdrawRequest } from './entities';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../payments/entities/transaction.entity';
import { AuthModule } from '../auth/auth.module';
import { WalletsController } from './wallet.controller';
import { WalletsService } from './wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      BankAccount,
      User,
      Transaction,
      WalletWithdrawRequest,
    ]),
    AuthModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
