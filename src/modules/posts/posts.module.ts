import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './entities/post.entity';
import { Tag } from './entities/tag.entity';
import { PostTag } from './entities/post-tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Tag, PostTag])],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
