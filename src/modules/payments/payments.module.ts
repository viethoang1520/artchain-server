import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Type } from 'class-transformer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Order } from './entities/order.entity';
import { ConfigModule } from '@nestjs/config';
import { Sponsor } from '../sponsors/entities/sponsor.entity';
import { Wallet } from '../wallets/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Campaign, Order, Sponsor, Wallet]),

  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }
