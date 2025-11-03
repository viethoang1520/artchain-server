import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('exhibitions')
export class Exhibition {
  @PrimaryGeneratedColumn({ name: 'exhibition_id' })
  exhibitionId: number;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string;

  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamp', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'int', default: 0, name: 'number_of_paintings' })
  numberOfPaintings: number;

  @Column({ type: 'varchar', length: 50, default: 'DRAFT', name: 'status' })
  status: string; // DRAFT, ACTIVE, COMPLETED, CANCELLED

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => require('./exhibition-painting.entity').ExhibitionPainting,
    (exhibitionPainting: any) => exhibitionPainting.exhibition,
  )
  exhibitionPaintings: any[];
}
