import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { AuctionStatus } from '../entities/auction.entity';

export class UpdateAuctionStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới của phiên đấu giá',
    enum: AuctionStatus,
    example: AuctionStatus.ONGOING,
  })
  @IsEnum(AuctionStatus, {
    message:
      'Status phải là một trong các giá trị: PENDING, ONGOING, COMPLETED, CANCELLED',
  })
  @IsNotEmpty({ message: 'Status không được để trống' })
  status: AuctionStatus;
}
