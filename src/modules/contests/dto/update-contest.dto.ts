import { PartialType } from '@nestjs/mapped-types';
import { CreateContestDto } from './create-contest.dto';
import { ApiProperty } from '@nestjs/swagger';
import { CreateRoundDto } from './create-round.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class UpdateContestDto extends PartialType(CreateContestDto) {
  @ApiProperty({
    type: [CreateRoundDto],
    required: false,
    description:
      'Array of rounds for the contest (will replace all existing rounds)',
    example: [
      {
        name: 'ROUND1',
        table: 'paintings',
        startDate: '2025-10-15T00:00:00.000Z',
        endDate: '2025-10-30T00:00:00.000Z',
        submissionDeadline: '2025-10-28T00:00:00.000Z',
        status: 'DRAFT',
      },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateRoundDto)
  rounds?: CreateRoundDto[];
}
