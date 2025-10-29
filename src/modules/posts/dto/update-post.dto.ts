import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsInt } from 'class-validator';
import { PostStatus } from '../entities/post.entity';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  account_id?: string;

  @ApiPropertyOptional({
    description: 'Title of the post',
    example: 'Introduction to NestJS',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Content of the post',
    example: 'This is a comprehensive guide to NestJS framework...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Image URL for the post',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({
    description: 'Status of the post',
    enum: PostStatus,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    description: 'Array of tag IDs to associate with the post',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsOptional()
  tag_ids?: number[] | string;
}
