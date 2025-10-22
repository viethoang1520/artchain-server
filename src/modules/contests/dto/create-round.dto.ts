import { ApiProperty } from '@nestjs/swagger';

export class CreateRoundDto {
  @ApiProperty({ example: 'ROUND1' })
  name: string;

  @ApiProperty({ example: 'paintings', required: false })
  table?: string;

  @ApiProperty({ example: '2025-10-15T00:00:00.000Z', required: false })
  startDate?: Date;

  @ApiProperty({ example: '2025-10-30T00:00:00.000Z', required: false })
  endDate?: Date;

  @ApiProperty({ example: '2025-10-28T00:00:00.000Z', required: false })
  submissionDeadline?: Date;

  @ApiProperty({ example: '2025-11-05T00:00:00.000Z', required: false })
  resultAnnounceDate?: Date;

  @ApiProperty({ example: '2025-11-10T00:00:00.000Z', required: false })
  sendOriginalDeadline?: Date;

  @ApiProperty({ example: 'DRAFT', required: false })
  status?: string;
}
