import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class UpdateAuctionDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề phiên đấu giá',
    example: 'Phiên đấu giá tranh sơn dầu',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Thời gian bắt đầu (ISO 8601 format)',
    example: '2026-05-10T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Thời gian kết thúc (ISO 8601 format)',
    example: '2026-05-10T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'ID người điều phối phiên (UUID)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  auctioneerId?: string;
}
