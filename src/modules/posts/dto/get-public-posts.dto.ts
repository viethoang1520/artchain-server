import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetPublicPostsDto {
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
    description: 'Filter by tag ID',
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === '') return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  })
  tag_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by account ID',
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === '') return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  })
  account_id?: number;
}
