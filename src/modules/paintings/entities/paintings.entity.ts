import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Evaluation } from './evaluation.entity';
import { Award } from '../../awards/entities/award.entity';
import { Contest } from '../../contests/entities/contests.entity';
import { Competitor } from '../../competitors/entities/competitors.entity';
import { ExhibitionPainting } from '../../exhibitions/entities/exhibition-painting.entity';
import { Round } from '../../contests/entities/round.entity';
import { AuctionPainting } from '../../auctions/entities/auction-painting.entity';
import { Vote } from '../../votes/entities/vote.entity';
import { Nft } from 'src/modules/nft/entities/nft.entity';


@Entity('paintings')
export class Painting {
  @PrimaryGeneratedColumn('uuid', { name: 'painting_id' })
  paintingId: string;

  @Column({ nullable: true, name: 'round_id' })
  roundId: number;

  @Column({ nullable: true, name: 'contest_id' })
  contestId: number;

  @Column({ nullable: true, name: 'competitor_id', type: 'uuid' })
  competitorId: string;

  @Column({ nullable: true, name: 'owner_id', type: 'uuid' })
  ownerId: string | null;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string;

  @Column({ length: 255, name: 'title' })
  title: string;

  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'timestamp', nullable: true, name: 'submission_date' })
  submissionDate: Date;

  @Column({ type: 'boolean', default: null, name: 'is_passed' })
  isPassed: boolean;

  @Column({ type: 'varchar', length: 50, default: 'PENDING', name: 'status' })
  status: string;

  @Column({ nullable: true, name: 'award_id' })
  awardId: number | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Evaluation, (evaluation) => evaluation.painting)
  evaluations: Evaluation[];

  @OneToMany(
    () => ExhibitionPainting,
    (exhibitionPainting) => exhibitionPainting.painting,
  )
  exhibitionPaintings: ExhibitionPainting[];

  @ManyToOne(() => Award, (award) => award.paintings)
  @JoinColumn({ name: 'award_id' })
  award: Award;

  @ManyToOne(() => Contest, (contest) => contest.paintings)
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @ManyToOne(() => Competitor, (competitor) => competitor.paintings)
  @JoinColumn({ name: 'competitor_id' })
  competitor: Competitor;

  @ManyToOne(() => Round, (round) => round.paintings)
  @JoinColumn({ name: 'round_id' })
  round: Round;

  @OneToMany(
    () => AuctionPainting,
    (auctionPainting) => auctionPainting.painting,
  )
  auctionPaintings: AuctionPainting[];

  @OneToOne(() => Nft, (nft) => nft.transactionHash)
  @JoinColumn({ name: 'nft' })
  nft: Nft;


  @OneToMany(() => Vote, (vote) => vote.painting)
  votes: Vote[];
}
