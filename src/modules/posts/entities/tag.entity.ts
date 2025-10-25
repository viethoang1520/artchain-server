import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { PostTag } from './post-tag.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  tag_id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  tag_name: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  // Relations
  @OneToMany(() => PostTag, (postTag) => postTag.tag)
  postTags: PostTag[];
}
