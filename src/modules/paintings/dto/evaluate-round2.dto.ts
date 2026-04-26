import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Round2CriteriaScoreDto {
  @ApiProperty({
    description: 'ID tiêu chí chấm điểm',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  criterionId: number;

  @ApiProperty({
    description: 'Điểm chấm cho tiêu chí tương ứng',
    example: 24,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  score: number;
}

export class EvaluateRound2Dto {
  @ApiProperty({
    description: 'ID của bức tranh cần đánh giá',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  paintingId: string;

  @ApiProperty({
    description: 'ID của giám khảo đánh giá',
    example: 'examiner-uuid-123',
  })
  @IsNotEmpty()
  examinerId: string;

  @ApiProperty({
    description:
      'Danh sách điểm theo tiêu chí động. Khi contest đã cấu hình tiêu chí động, nên dùng trường này.',
    type: [Round2CriteriaScoreDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Round2CriteriaScoreDto)
  criteriaScores?: Round2CriteriaScoreDto[];

  @ApiProperty({
    description:
      'Creativity & Originality - Unique idea, imagination, expression (0-30 points)',
    example: 25,
    minimum: 0,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  creativityScore?: number;

  @ApiProperty({
    description:
      'Composition - Balanced, organized, with clear focus (0-20 points)',
    example: 18,
    minimum: 0,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  compositionScore?: number;

  @ApiProperty({
    description:
      'Color & Technique - Good use of colors, clean execution (0-20 points)',
    example: 17,
    minimum: 0,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  colorScore?: number;

  @ApiProperty({
    description:
      'Relevance to Theme - Clear message, fits the topic (0-20 points)',
    example: 19,
    minimum: 0,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  technicalScore?: number;

  @ApiProperty({
    description:
      'Overall Aesthetic - Attractive and well-presented (0-10 points)',
    example: 9,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  aestheticScore?: number;

  @ApiProperty({
    description: 'Nhận xét chi tiết về bức tranh',
    example:
      'Bức tranh thể hiện sự sáng tạo cao, bố cục hài hòa và kỹ thuật thực hiện tốt.',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
