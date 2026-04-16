import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TransactionStatus } from '../../payments/entities/transaction.entity';

export class TransactionHistoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by transaction status',
    enum: TransactionStatus,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
}
