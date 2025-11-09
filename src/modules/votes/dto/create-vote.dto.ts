import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsInt, IsOptional } from 'class-validator';

export class CreateVoteDto {
  @ApiProperty({
    description: 'ID của painting được vote',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  paintingId: string;

  @ApiProperty({
    description: 'ID của account đang vote',
    example: 'ba9b73f4-bdfd-4374-b289-5c1fcff701fe',
  })
  @IsNotEmpty()
  @IsUUID()
  accountId: string;

  @ApiProperty({
    description: 'ID của award (giải thưởng) - optional',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  awardId?: number;

  @ApiProperty({
    description: 'ID của contest',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  contestId: number;
}
