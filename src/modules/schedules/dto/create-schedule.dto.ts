import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsInt,
  Matches,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({
    description: 'ID của contest',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  contestId: number;

  @ApiProperty({
    description: 'ID của examiner',
    example: 'EXM001',
  })
  @IsNotEmpty()
  @IsString()
  examinerId: string;

  @ApiProperty({
    description: 'Nhiệm vụ/công việc cần làm',
    example: 'Chấm bài vòng sơ khảo',
  })
  @IsNotEmpty()
  @IsString()
  task: string;

  @ApiProperty({
    description: 'Ngày thực hiện (YYYY-MM-DD)',
    example: '2025-11-15',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'ACTIVE',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description:
      'Bảng ROUND_2 được phân cho examiner (A-Z). Bắt buộc nếu task thuộc ROUND_2.',
    example: 'A',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]$/, {
    message: 'round2Table must be a single letter from A to Z',
  })
  round2Table?: string;
}
