import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class WithdrawWalletDto {
  @ApiProperty({
    description: 'ID của user sở hữu ví',
    example: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
  })
  @IsNotEmpty()
  @IsUUID()
  accountId: string;

  @ApiProperty({
    description: 'Số tiền cần rút',
    example: 50000,
  })
  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
