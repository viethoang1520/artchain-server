import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SponsorshipTier } from './sponsorship-tier.entity';

@Entity('tiers')
export class Tier {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'display', nullable: true })
  display: string;

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'benefits', type: 'text', nullable: true })
  benefits: string;

  @OneToMany(() => SponsorshipTier, (sponsorshipTier) => sponsorshipTier.tier)
  sponsorshipTiers: SponsorshipTier[];

}
