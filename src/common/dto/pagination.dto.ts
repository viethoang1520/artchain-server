import { IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
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
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === '') return 10;
    const num = parseInt(value, 10);
    return isNaN(num) || num < 1 ? 10 : num;
  })
  limit?: number = 10;
}
