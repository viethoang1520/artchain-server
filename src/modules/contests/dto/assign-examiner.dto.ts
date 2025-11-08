import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignExaminerDto {
  @ApiProperty({
    description: 'Examiner ID to assign to the contest',
    example: 'EXM001',
  })
  @IsNotEmpty()
  @IsString()
  examiner_id: string;

  @ApiPropertyOptional({
    description: 'Role of the examiner in the contest',
    example: 'ROUND_1',
  })
  @IsOptional()
  @IsString()
  role?: string;
}
