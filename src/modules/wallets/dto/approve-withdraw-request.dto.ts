import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class ApproveWithdrawRequestDto {
  @ApiPropertyOptional({
    description: 'Ảnh chứng từ chuyển khoản đã xử lý ngoài hệ thống',
    example: 'https://cdn.example.com/proofs/withdraw-1.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  proofImageUrl?: string;

  @ApiPropertyOptional({ description: 'Ghi chú của staff' })
  @IsOptional()
  @IsString()
  staffNote?: string;
}
