import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptMultipleSubmissionsDto {
  @ApiProperty({
    description: 'Array of painting IDs to accept',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  paintingIds: string[];
}
