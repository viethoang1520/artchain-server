import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddPaintingToAuctionDto {
  @ApiProperty({ example: 'painting-uuid-here' })
  @IsNotEmpty()
  @IsString()
  paintingId: string;

  @ApiProperty({ example: 1000000, description: 'Giá khởi điểm (VNĐ)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    example: 10000000,
    description: 'Giá trần (VNĐ)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ceilPrice?: number;

  @ApiProperty({ example: 100000, description: 'Bước giá (VNĐ)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  bidStep: number;

  @ApiProperty({
    example: 15,
    description: 'Thời gian đấu giá cho bức tranh (phút)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  auctionDurationMinutes: number;
}
