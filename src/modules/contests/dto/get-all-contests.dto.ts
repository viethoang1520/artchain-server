import { ApiProperty } from '@nestjs/swagger';
import { ContestStatus } from '../entities/contests.entity';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
  IsString,
} from 'class-validator';

export class GetAllContestsDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Search by contest title',
    example: 'Art Competition',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by contest status',
    enum: ContestStatus,
    example: ContestStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ContestStatus)
  status?: ContestStatus;

  @ApiProperty({
    description: 'Filter by start date (from)',
    example: '2025-10-01T00:00:00.000Z',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiProperty({
    description: 'Filter by start date (to)',
    example: '2025-12-31T23:59:59.999Z',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiProperty({
    description: 'Filter by end date (from)',
    example: '2025-10-01T00:00:00.000Z',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsDateString()
  endDateFrom?: string;

  @ApiProperty({
    description: 'Filter by end date (to)',
    example: '2025-12-31T23:59:59.999Z',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsDateString()
  endDateTo?: string;
}
