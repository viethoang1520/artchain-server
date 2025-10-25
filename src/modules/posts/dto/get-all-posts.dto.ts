import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PostStatus } from '../entities/post.entity';

export class GetAllPostsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === '') return 1;
    const num = parseInt(value, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === '') return 10;
    const num = parseInt(value, 10);
    return isNaN(num) || num < 1 ? 10 : num;
  })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by title',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: PostStatus,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    description: 'Filter by account ID',
  })
  @IsOptional()
  @IsString()
  account_id?: string;
}
