import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Exhibition } from './exhibition.entity';
import { Painting } from '../../paintings/entities/paintings.entity';

@Entity('exhibition_paintings')
export class ExhibitionPainting {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'exhibition_id' })
  exhibitionId: number;

  @Column({ name: 'painting_id' })
  paintingId: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Exhibition, (exhibition) => exhibition.exhibitionPaintings)
  @JoinColumn({ name: 'exhibition_id' })
  exhibition: Exhibition;

  @ManyToOne(() => Painting)
  @JoinColumn({ name: 'painting_id' })
  painting: Painting;
}
