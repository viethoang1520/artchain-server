import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAwardDto {
  @ApiProperty({
    description: 'Contest ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  contestId: number;

  @ApiProperty({
    description: 'Award name',
    example: 'First Prize',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Award description',
    example: 'Best painting in the contest',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Rank of the award (1 = first, 2 = second, etc.)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  rank?: number;

  @ApiProperty({
    description: 'Number of awards available',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsInt()
  quantity?: number;

  @ApiProperty({
    description: 'Prize money or value',
    example: 1000000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  prize?: number;
}
