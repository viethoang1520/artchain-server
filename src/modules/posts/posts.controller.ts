import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { GetPublicPostsDto } from './dto/get-public-posts.dto';

@ApiTags('Posts')
@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('tags')
  @ApiOperation({
    summary: 'Get all tags (public, no auth required)',
  })
  async getAllTags() {
    return this.postsService.getAllTags();
  }

  @Get()
  @ApiOperation({
    summary: 'Get all published posts (public, no auth required)',
  })
  async getPublicPosts(@Query() queryDto: GetPublicPostsDto) {
    return this.postsService.getPublicPosts(queryDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get post detail by ID (public, no auth required)',
    description: 'Get detailed information of a specific published post',
  })
  @ApiParam({
    name: 'id',
    description: 'Post ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved post detail',
    schema: {
      type: 'object',
      properties: {
        post_id: { type: 'number', example: 1 },
        title: { type: 'string', example: 'Introduction to NestJS' },
        content: {
          type: 'string',
          example: 'This is a comprehensive guide...',
        },
        image_url: {
          type: 'string',
          example: 'https://storage.googleapis.com/...',
        },
        status: { type: 'string', example: 'PUBLISHED' },
        account_id: { type: 'string', example: 'user-uuid' },
        created_at: { type: 'string', example: '2025-10-31T00:00:00Z' },
        updated_at: { type: 'string', example: '2025-10-31T00:00:00Z' },
        creator: {
          type: 'object',
          properties: {
            user_id: { type: 'string', example: 'user-uuid' },
            email: { type: 'string', example: 'user@example.com' },
            fullname: { type: 'string', example: 'John Doe' },
          },
        },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tag_id: { type: 'number', example: 1 },
              tag_name: { type: 'string', example: 'NestJS' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found or not published',
  })
  async getPostDetail(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostDetail(id);
  }
}
