import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccount, Wallet, WalletWithdrawRequest } from './entities';
import { AuthModule } from '../auth/auth.module';
import { WalletsController } from './wallet.controller';
import { WalletsService } from './wallet.service';
import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, BankAccount, WalletWithdrawRequest]),
    AuthModule,
    UsersModule,
    PaymentsModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
