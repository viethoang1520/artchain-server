import { Module } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { SponsorsController } from './sponsors.controller';
import { Type } from 'class-transformer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { FirebaseModule } from '../firebase/firebase.module';
import { PaymentsModule } from '../payments/payments.module';
import { Tier } from '../tiers/entities/tier.entity';
import { SponsorshipTier } from '../tiers/entities/sponsorship-tier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sponsor, Campaign, Tier, SponsorshipTier]),
    FirebaseModule,
    PaymentsModule,
  ],
  controllers: [SponsorsController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule { }
