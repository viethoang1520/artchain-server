import {
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuctionStatus } from '../entities/auction.entity';
import { Type } from 'class-transformer';

export class QueryAuctionDto {
  @ApiProperty({
    enum: AuctionStatus,
    required: false,
    description: 'Lọc theo trạng thái phiên đấu giá',
  })
  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;

  @ApiProperty({
    example: '2026-01-01',
    required: false,
    description: 'Lọc phiên bắt đầu từ ngày này trở đi',
  })
  @IsOptional()
  @IsDateString()
  startFrom?: string;

  @ApiProperty({
    example: '2026-12-31',
    required: false,
    description: 'Lọc phiên bắt đầu trước ngày này',
  })
  @IsOptional()
  @IsDateString()
  startTo?: string;

  @ApiProperty({
    example: '2026-01-01',
    required: false,
    description: 'Lọc phiên kết thúc từ ngày này trở đi',
  })
  @IsOptional()
  @IsDateString()
  endFrom?: string;

  @ApiProperty({
    example: '2026-12-31',
    required: false,
    description: 'Lọc phiên kết thúc trước ngày này',
  })
  @IsOptional()
  @IsDateString()
  endTo?: string;

  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
