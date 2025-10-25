import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GetAllSubmissionsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Contest ID to filter submissions',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contestId?: number;

  @ApiPropertyOptional({
    description: 'Round ID to filter submissions',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roundId?: number;

  @ApiPropertyOptional({
    description: 'Status to filter submissions (PENDING, ACCEPTED, REJECTED)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
