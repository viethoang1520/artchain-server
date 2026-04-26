import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class Round2EvaluationCriteriaItemDto {
  @ApiProperty({
    description: 'Tên tiêu chí chấm điểm',
    example: 'Tính sáng tạo',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả tiêu chí',
    example: 'Đánh giá ý tưởng mới và tính độc đáo',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Điểm tối đa của tiêu chí',
    example: 30,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  maxScore: number;

  @ApiProperty({
    description: 'Trọng số tiêu chí (%)',
    example: 30,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  weight: number;
}

export class CreateRound2EvaluationCriteriaConfigDto {
  @ApiProperty({
    description: 'Danh sách tiêu chí chấm điểm vòng 2',
    type: [Round2EvaluationCriteriaItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => Round2EvaluationCriteriaItemDto)
  criteria: Round2EvaluationCriteriaItemDto[];
}
