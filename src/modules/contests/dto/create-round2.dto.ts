import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRound2Dto {
  @ApiProperty({
    description: 'ID của cuộc thi',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  contestId: number;
}
