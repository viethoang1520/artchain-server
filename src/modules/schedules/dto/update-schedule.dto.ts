import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsNotEmpty,
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
}
