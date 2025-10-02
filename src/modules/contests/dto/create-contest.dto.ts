import { ApiProperty } from '@nestjs/swagger';
import { ContestStatus } from '../entities/contests.entity';

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

  @ApiProperty({ enum: ContestStatus, example: ContestStatus.ACTIVE })
  status: ContestStatus;

  @ApiProperty({ example: 'admin' })
  createdBy: string;
}
