import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './entities/post.entity';
import { Tag } from './entities/tag.entity';
import { PostTag } from './entities/post-tag.entity';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Tag, PostTag]), FirebaseModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
