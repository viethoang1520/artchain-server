import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { WalletWithdrawRequestStatus } from '../entities';

export class QueryWithdrawRequestDto extends PaginationDto {
  @ApiPropertyOptional({ enum: WalletWithdrawRequestStatus })
  @IsOptional()
  @IsEnum(WalletWithdrawRequestStatus)
  status?: WalletWithdrawRequestStatus;
}
