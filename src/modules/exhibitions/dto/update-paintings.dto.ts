import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

class UpdatePaintingDtoItem {
  @ApiProperty({
    description: 'ID của bức tranh cần cập nhật',
    example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  paintingId: string;
  @ApiProperty({
    description: 'Vị trí mới của bức tranh trong triển lãm [x, y, z]',
    example: [1.0, 2.0, 3.0],
  })
  @IsArray()
  position: number[];

  @ApiProperty({
    description: 'Xoay mới của bức tranh trong triển lãm [x, y, z, order?]',
    example: [0.0, 0.0, 0.0, 'XYZ'],
  })
  @IsArray()
  rotation: [number, number, number, string?];
  @ApiProperty({
    description: 'Tỉ lệ mới của bức tranh trong triển lãm [x, y, z]',
    example: [1.0, 1.0, 1.0],
  })
  @IsArray()
  scale: number[];
}

export class UpdatePaintingDto {
  @ApiProperty({
    description:
      'Danh sách cập nhật vị trí, xoay, tỉ lệ của các bức tranh trong triển lãm',
    example: [
      {
        paintingId: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
        position: [1.0, 2.0, 3.0],
        rotation: [0.0, 0.0, 0.0, 'XYZ'],
        scale: [1.0, 1.0, 1.0],
      },
    ],
    type: [Object],
  })
  data: UpdatePaintingDtoItem[];
}
