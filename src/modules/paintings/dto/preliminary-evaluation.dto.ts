import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
export class PreliminaryEvaluationDto {
  @ApiProperty({
    description: 'ID của bức tranh cần đánh giá',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  paintingId: string;

  @ApiProperty({
    description: 'ID của giám khảo đánh giá',
    example: '123',
  })
  @IsNotEmpty()
  examinerId: string;

  @ApiProperty({
    description: 'Trạng thái đánh giá (true/false)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPassed: boolean;
}