import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum BidHistoryStatus {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  OUTBID = 'OUTBID',
}

export class GetBidHistoryDto {
  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái bid',
    enum: BidHistoryStatus,
    example: BidHistoryStatus.ALL,
  })
  @IsOptional()
  @IsEnum(BidHistoryStatus)
  status?: BidHistoryStatus = BidHistoryStatus.ALL;
}
