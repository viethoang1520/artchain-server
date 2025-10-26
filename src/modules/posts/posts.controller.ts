import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { GetPublicPostsDto } from './dto/get-public-posts.dto';

@ApiTags('Posts')
@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all published posts (public, no auth required)',
  })
  async getPublicPosts(@Query() queryDto: GetPublicPostsDto) {
    return this.postsService.getPublicPosts(queryDto);
  }
}
