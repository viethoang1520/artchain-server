import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class UpdateScheduleDto {
  @ApiPropertyOptional({
    description: 'ID của contest',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  contestId?: number;

  @ApiPropertyOptional({
    description: 'ID của examiner',
    example: 'EXM001',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  examinerId?: string;

  @ApiPropertyOptional({
    description: 'Nhiệm vụ/công việc cần làm',
    example: 'Chấm bài vòng chung kết',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  task?: string;

  @ApiPropertyOptional({
    description: 'Ngày thực hiện (YYYY-MM-DD)',
    example: '2025-11-20',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;

  @ApiPropertyOptional({
    description:
      'Bảng ROUND_2 được phân cho examiner (A-Z). Dùng cho nghiệp vụ mỗi examiner chấm 1 bảng.',
    example: 'B',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]$/, {
    message: 'round2Table must be a single letter from A to Z',
  })
  round2Table?: string;
}
