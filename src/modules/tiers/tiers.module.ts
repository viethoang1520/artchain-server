import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiersService } from './tiers.service';
import { TiersController } from './tiers.controller';
import { Tier } from './entities/tier.entity';
import { SponsorshipTier } from './entities/sponsorship-tier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tier, SponsorshipTier])],
  controllers: [TiersController],
  providers: [TiersService],
})
export class TiersModule { }
