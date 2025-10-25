import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
} from 'class-validator';
import { PostStatus } from '../entities/post.entity';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  account_id?: string;

  @ApiProperty({
    description: 'Title of the post',
    example: 'Introduction to NestJS',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Content of the post',
    example: 'This is a comprehensive guide to NestJS framework...',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

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
    default: PostStatus.DRAFT,
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
  @IsArray()
  @IsInt({ each: true })
  tag_ids?: number[];
}
