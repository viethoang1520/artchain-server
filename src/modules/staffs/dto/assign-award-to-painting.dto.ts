import { IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAwardToPaintingDto {
  @ApiProperty({
    description: 'Award ID to assign to the painting',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  awardId: number;
}
