import { ApiProperty } from '@nestjs/swagger';
import { ContestStatus } from '../entities/contests.entity';
import { CreateRoundDto } from './create-round.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class CreateContestDto {
  @ApiProperty({ example: 'Art Competition 2025' })
  title: string;

  @ApiProperty({ example: 'A competition for young artists', required: false })
  description?: string;

  @ApiProperty({ example: 'https://example.com/banner.jpg', required: false })
  bannerUrl?: string;

  @ApiProperty({ example: 3, required: false })
  numOfAward?: number;

  @ApiProperty({ example: '2025-10-15T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2025-11-15T00:00:00.000Z' })
  endDate: Date;

  @ApiProperty({ enum: ContestStatus, example: ContestStatus.DRAFT })
  status: ContestStatus;

  @ApiProperty({ example: 'admin' })
  createdBy: string;

  @ApiProperty({
    type: [CreateRoundDto],
    required: false,
    description: 'Array of rounds for the contest',
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
