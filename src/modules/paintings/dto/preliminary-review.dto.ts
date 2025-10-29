import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaintingReviewItem {
  @ApiProperty({
    description: 'ID của bức tranh',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  paintingId: string;

  @ApiProperty({
    description: 'Kết quả vòng sơ khảo - true: Đạt, false: Không đạt',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isPassed: boolean;
}

export class PreliminaryReviewDto {
  @ApiProperty({
    description: 'Mảng các bức tranh cần chấm sơ khảo',
    type: [PaintingReviewItem],
    example: [
      { paintingId: '123e4567-e89b-12d3-a456-426614174000', isPassed: true },
      { paintingId: '223e4567-e89b-12d3-a456-426614174001', isPassed: false },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaintingReviewItem)
  paintings: PaintingReviewItem[];
}
