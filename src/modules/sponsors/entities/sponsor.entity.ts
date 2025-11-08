import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum SponsorStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

@Entity('sponsors')
export class Sponsor {
  @PrimaryGeneratedColumn({ name: 'sponsor_id' })
  sponsorId: number;

  @Column({ name: 'name', nullable: false })
  name: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'contact_info', nullable: true })
  contactInfo: string;

  @Column({
    name: 'sponsorship_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value, // khi lưu
      from: (value: string) => parseFloat(value), // khi đọc
    },
    nullable: true,
  })
  sponsorshipAmount: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SponsorStatus,
    default: SponsorStatus.PENDING,
    nullable: false,
  })
  status: SponsorStatus;

  @Column({ name: 'campaign_id', nullable: true })
  campaignId: number;
}
