import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class EvaluatePaintingDto {
  @ApiProperty({
    description: 'ID của bức tranh cần đánh giá',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  paintingId: string;

  @ApiProperty({
    description: 'ID của giám khảo đánh giá',
    example: '123',
  })
  @IsNotEmpty()
  examinerId: string;

  @ApiProperty({
    description: 'Điểm số đánh giá (1-10)',
    example: 8,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(10)
  score: number;

  @ApiProperty({
    description: 'Nhận xét về bức tranh',
    example: 'Bức tranh có bố cục tốt, màu sắc hài hòa, thể hiện được cảm xúc.',
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
