import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Contest, ContestStatus } from '../entities/contests.entity';

export class GetContestDto {
  @ApiProperty({
    required: false,
    enum: ContestStatus,
    example: ContestStatus.ACTIVE,
  })
  @IsOptional()
  status?: ContestStatus;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'Page number (starts from 1)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    required: false,
    example: 10,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
