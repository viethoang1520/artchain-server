import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum ExhibitionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateExhibitionDto {
  @ApiProperty({
    description: 'Tên triển lãm',
    example: 'Triển lãm Tranh Thiếu Nhi 2025',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Mô tả về triển lãm',
    example: 'Triển lãm các tác phẩm xuất sắc từ cuộc thi vẽ tranh thiếu nhi',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Ngày bắt đầu triển lãm',
    example: '2025-12-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc triển lãm',
    example: '2025-12-31T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Trạng thái triển lãm',
    enum: ExhibitionStatus,
    example: ExhibitionStatus.DRAFT,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExhibitionStatus)
  status?: ExhibitionStatus;
}
