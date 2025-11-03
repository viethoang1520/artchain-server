import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, IsString } from 'class-validator';

export class AddPaintingsToExhibitionDto {
  @ApiProperty({
    description: 'Danh sách painting IDs cần thêm vào triển lãm',
    example: [
      'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
      'c2b3d4e5-f6g7-8h9i-0j1k-l2m3n4o5p6q7',
    ],
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  paintingIds: string[];
}
