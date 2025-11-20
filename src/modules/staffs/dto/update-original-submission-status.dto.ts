import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOriginalSubmissionStatusDto {
  @ApiProperty({
    description:
      'Whether the original painting has been submitted. If true, status will be set to ORIGINAL_SUBMITTED. If false, status will be set to NOT_SUBMITTED_ORIGINAL and painting will be replaced.',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  hasSubmittedOriginal: boolean;
}
