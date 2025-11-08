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
  tag_ids?: number[] | string;
}
