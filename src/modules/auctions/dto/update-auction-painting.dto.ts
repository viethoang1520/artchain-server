import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsNumberString,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsString,
  Min,
} from 'class-validator';

export class UpdateAuctionPaintingDto {
  @ApiPropertyOptional({
    description: 'Thời gian đấu giá cho tranh (phút)',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  auctionDurationMinutes?: number | null;

  @ApiPropertyOptional({
    description: 'Thời điểm bắt đầu cho tranh (ISO 8601 format)',
    example: '2026-05-10T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  auctionStartTime?: string | null;

  @ApiPropertyOptional({
    description: 'Thời điểm kết thúc cho tranh (ISO 8601 format)',
    example: '2026-05-10T10:10:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  auctionEndTime?: string | null;

  @ApiPropertyOptional({
    description: 'Giá khởi điểm',
    example: '1000000',
  })
  @IsOptional()
  @IsNumberString()
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Giá trần',
    example: '5000000',
  })
  @IsOptional()
  @IsNumberString()
  ceilPrice?: number | null;

  @ApiPropertyOptional({
    description: 'Bước giá tối thiểu',
    example: '50000',
  })
  @IsOptional()
  @IsNumberString()
  bidStep?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái tranh trong phiên (WAITING, LIVE, END)',
    example: 'WAITING',
    enum: ['WAITING', 'LIVE', 'END'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Đã bán hay chưa',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSold?: boolean;

  @ApiPropertyOptional({
    description: 'Số lần thu hồi',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  revoked?: number;

  @ApiPropertyOptional({
    description: 'ID người đặt giá hiện tại (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  currentBidderId?: string | null;
}
