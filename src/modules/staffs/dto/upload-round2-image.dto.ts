import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UploadRound2ImageDto {
  @ApiProperty({
    description: 'ID của painting cần upload ảnh',
    example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  @IsNotEmpty()
  @IsUUID()
  paintingId: string;
}
