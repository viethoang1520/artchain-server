import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceBidDto {
  @ApiProperty({ example: 1, description: 'ID của auction painting' })
  @IsNotEmpty()
  @IsNumber()
  auctionPaintingId: number;

  @ApiProperty({ example: 1500000, description: 'Số tiền đặt giá (VNĐ)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  bidAmount: number;
}
