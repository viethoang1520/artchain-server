import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuctionDto {
  @ApiProperty({ example: 'Phiên đấu giá tranh tháng 1/2026' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: '2026-01-20T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-01-25T18:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 'user-uuid-here', required: false })
  @IsOptional()
  @IsString()
  auctioneerId?: string;
}
