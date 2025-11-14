import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { Sponsor } from '../sponsors/entities/sponsor.entity';
import { Transaction } from '../payments/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Sponsor, Transaction])],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
