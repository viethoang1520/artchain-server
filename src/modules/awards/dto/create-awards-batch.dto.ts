import {
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateAwardDto } from './create-award.dto';

export class CreateAwardsBatchDto {
  @ApiProperty({
    description: 'Array of awards to create',
    type: [CreateAwardDto],
    example: [
      {
        contestId: 1,
        name: 'First Prize',
        description: 'Best painting in the contest',
        rank: 1,
        quantity: 1,
        prize: 5000000,
      },
      {
        contestId: 1,
        name: 'Second Prize',
        description: 'Runner-up',
        rank: 2,
        quantity: 2,
        prize: 3000000,
      },
      {
        contestId: 1,
        name: 'Third Prize',
        description: 'Third place',
        rank: 3,
        quantity: 3,
        prize: 1000000,
      },
    ],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAwardDto)
  awards: CreateAwardDto[];
}
