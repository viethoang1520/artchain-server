import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCriteriaDto {
  @ApiProperty({
    description: 'Tên tiêu chí',
    example: 'Tính sáng tạo',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả tiêu chí',
    example: 'Đánh giá sự độc đáo và mới mẻ trong ý tưởng',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Điểm tối đa của tiêu chí',
    example: 30,
  })
  @IsInt()
  @Min(1)
  maxScore: number;

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt tiêu chí',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
