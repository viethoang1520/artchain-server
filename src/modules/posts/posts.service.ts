import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus } from './entities/post.entity';
import { Tag } from './entities/tag.entity';
import { PostTag } from './entities/post-tag.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { GetAllPostsDto } from './dto/get-all-posts.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    @InjectRepository(PostTag)
    private readonly postTagsRepository: Repository<PostTag>,
  ) {}

  async createPost(createPostDto: CreatePostDto) {
    const { tag_ids, ...postData } = createPostDto;

    const post = this.postsRepository.create(postData);
    const savedPost = await this.postsRepository.save(post);

    if (tag_ids && tag_ids.length > 0) {
      await this.addTagsToPost(savedPost.post_id, tag_ids);
    }

    const result = await this.postsRepository.findOne({
      where: { post_id: savedPost.post_id },
      relations: ['postTags', 'postTags.tag', 'creator'],
    });

    return {
      success: true,
      message: 'Post created successfully',
      data: result,
    };
  }

  async getAllPosts(queryDto: GetAllPostsDto) {
    const { page = 1, limit = 10, search, status, account_id } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.postTags', 'postTags')
      .leftJoinAndSelect('postTags.tag', 'tag')
      .leftJoinAndSelect('post.creator', 'creator')
      .where('post.status != :deletedStatus', {
        deletedStatus: PostStatus.DELETED,
      });

    if (search) {
      queryBuilder.andWhere('post.title ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('post.status = :status', { status });
    }

    if (account_id) {
      queryBuilder.andWhere('post.account_id = :account_id', { account_id });
    }

    queryBuilder.orderBy('post.created_at', 'DESC').skip(skip).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      success: true,
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async getPostById(id: number) {
    const post = await this.postsRepository.findOne({
      where: { post_id: id },
      relations: ['postTags', 'postTags.tag', 'creator'],
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return {
      success: true,
      data: post,
    };
  }

  async updatePost(id: number, updatePostDto: UpdatePostDto) {
    const post = await this.postsRepository.findOne({
      where: { post_id: id },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const { tag_ids, ...postData } = updatePostDto;

    Object.assign(post, postData);
    await this.postsRepository.save(post);

    if (tag_ids !== undefined) {
      await this.postTagsRepository.delete({ post_id: id });

      if (tag_ids.length > 0) {
        await this.addTagsToPost(id, tag_ids);
      }
    }
    const result = await this.postsRepository.findOne({
      where: { post_id: id },
      relations: ['postTags', 'postTags.tag', 'creator'],
    });

    return {
      success: true,
      message: 'Post updated successfully',
      data: result,
    };
  }

  async softDeletePost(id: number) {
    const post = await this.postsRepository.findOne({
      where: { post_id: id },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    post.status = PostStatus.DELETED;
    await this.postsRepository.save(post);

    return {
      success: true,
      message: 'Post deleted successfully',
    };
  }

  async restorePost(id: number) {
    const post = await this.postsRepository.findOne({
      where: { post_id: id, status: PostStatus.DELETED },
    });

    if (!post) {
      throw new NotFoundException(`Deleted post with ID ${id} not found`);
    }

    post.status = PostStatus.DRAFT;
    await this.postsRepository.save(post);

    const result = await this.postsRepository.findOne({
      where: { post_id: id },
      relations: ['postTags', 'postTags.tag', 'creator'],
    });

    return {
      success: true,
      message: 'Post restored successfully',
      data: result,
    };
  }

  async publishPost(id: number) {
    const post = await this.postsRepository.findOne({
      where: { post_id: id },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    post.status = PostStatus.PUBLISHED;
    post.published_at = new Date();
    await this.postsRepository.save(post);

    return {
      success: true,
      message: 'Post published successfully',
      data: post,
    };
  }

  private async addTagsToPost(postId: number, tagIds: number[]) {
    const tags = await this.tagsRepository.findByIds(tagIds);
    if (tags.length !== tagIds.length) {
      throw new BadRequestException('Some tags do not exist');
    }
    const postTags = tagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
    }));

    await this.postTagsRepository.save(postTags);
  }

  async createTag(tag_name: string) {
    const existingTag = await this.tagsRepository.findOne({
      where: { tag_name },
    });

    if (existingTag) {
      throw new BadRequestException('Tag already exists');
    }

    const tag = this.tagsRepository.create({ tag_name });
    const savedTag = await this.tagsRepository.save(tag);

    return {
      success: true,
      message: 'Tag created successfully',
      data: savedTag,
    };
  }

  async getAllTags() {
    const tags = await this.tagsRepository.find({
      order: { tag_name: 'ASC' },
    });

    return {
      success: true,
      data: tags,
    };
  }

  async deleteTag(id: number) {
    const tag = await this.tagsRepository.findOne({
      where: { tag_id: id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    await this.tagsRepository.delete(id);

    return {
      success: true,
      message: 'Tag deleted successfully',
    };
  }
}
