import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tier } from './tier.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('sponsorship_tiers')
export class SponsorshipTier {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'campaign_id' })
  campaignId: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.sponsorshipTiers)
  @JoinColumn({ name: 'campaign_id', referencedColumnName: 'campaignId' })
  campaign: Campaign;

  @Column({ name: 'tier' })
  tierId: number;

  @ManyToOne(() => Tier, (tier) => tier.sponsorshipTiers)
  @JoinColumn({ name: 'tier' })
  tier: Tier;

  @Column({
    name: 'min_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  minPrice: number;

  @Column({
    name: 'max_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
    nullable: true,
  })
  maxPrice: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}