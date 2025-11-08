import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Contest } from '../../contests/entities/contests.entity';
import { Painting } from '../../paintings/entities/paintings.entity';

@Entity('awards')
export class Award {
  @PrimaryGeneratedColumn({ name: 'award_id' })
  awardId: number;

  @Column({ name: 'contest_id', nullable: false })
  contestId: number;

  @Column({ type: 'varchar', length: 255, name: 'name', nullable: false })
  name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string;

  @Column({ type: 'int', name: 'rank', nullable: true })
  rank: number;

  @Column({ type: 'int', name: 'quantity', nullable: true })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'prize',
    nullable: true,
  })
  prize: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;


  @ManyToOne(() => Contest, (contest) => contest.awards)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @OneToMany(() => Painting, (painting) => painting.award)
  paintings: Painting[];
}
