import { ApiProperty } from '@nestjs/swagger';

export class ReviewSubmissionDto {
  @ApiProperty({
    description: 'Review status for the submission',
    enum: ['ACCEPTED', 'REJECTED'],
    example: 'ACCEPTED',
  })
  status: 'ACCEPTED' | 'REJECTED';

  @ApiProperty({
    description: 'Reason for rejection (required if status is REJECTED)',
    example: 'Does not meet quality standards',
    required: false,
  })
  reason?: string;
}
