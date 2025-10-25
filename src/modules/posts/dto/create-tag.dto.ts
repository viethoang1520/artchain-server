import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'Technology',
  })
  @IsNotEmpty()
  @IsString()
  tag_name: string;
}
