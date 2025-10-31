import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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

  @Column({
    name: 'goal_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false
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
    default: 0
  })
  currentAmount: number;

  @Column({ name: 'deadline', type: 'timestamp', nullable: false })
  deadline: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT
  })
  status: CampaignStatus;

  @Column({ name: 'staff_id', nullable: false })
  staffId: string;

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
