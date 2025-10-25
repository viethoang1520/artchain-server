import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GetRoundsByContestDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Contest ID to filter rounds',
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === '') return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  })
  contestId?: number;
}
