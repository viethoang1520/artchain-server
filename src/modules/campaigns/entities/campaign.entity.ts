import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Sponsor } from '../../sponsors/entities/sponsor.entity';
import { SponsorshipTier } from '../../tiers/entities/sponsorship-tier.entity';

export enum CampaignStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  COMPLETED = 'COMPLETED',
  DRAFT = 'DRAFT',
  CANCELLED = 'CANCELLED',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn({ name: 'campaign_id' })
  campaignId: number;

  @Column({ name: 'title', nullable: false })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image', nullable: true })
  image: string;

  @Column({
    name: 'goal_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  goalAmount: number;

  @Column({
    name: 'current_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: {
      to: (value: number) => value, // khi lưu
      from: (value: string) => parseFloat(value), // khi đọc
    },
    default: 0,
  })
  currentAmount: number;

  @Column({ name: 'deadline', type: 'timestamp', nullable: false })
  deadline: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ name: 'staff_id', type: 'uuid', nullable: false })
  staffId: string;

  @ManyToOne(() => User, (user) => user.campaigns)
  @JoinColumn({ name: 'staff_id' })
  staff: User;

  @OneToMany(() => Sponsor, (sponsor) => sponsor.campaign)
  sponsors: Sponsor[];

  @OneToMany(() => SponsorshipTier, (sponsorshipTier) => sponsorshipTier.campaign)
  sponsorshipTiers: SponsorshipTier[];

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
