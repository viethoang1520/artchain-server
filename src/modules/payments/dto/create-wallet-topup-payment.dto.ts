import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CreateWalletTopupPaymentDto {
  @ApiProperty({
    example: 200000,
    description: 'Số tiền cần nạp vào ví (VND)',
    minimum: 1000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  amount: number;
}
