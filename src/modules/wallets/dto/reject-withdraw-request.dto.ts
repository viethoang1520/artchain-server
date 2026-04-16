import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RejectWithdrawRequestDto {
  @ApiProperty({ description: 'Lý do từ chối yêu cầu rút tiền' })
  @IsString()
  @IsNotEmpty()
  rejectReason: string;

  @ApiPropertyOptional({ description: 'Ghi chú của staff' })
  @IsOptional()
  @IsString()
  staffNote?: string;
}
