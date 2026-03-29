import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class MintNftDto { 
  @ApiProperty()
  @IsString()
  imageUrl: string;
  
  @ApiProperty()
  @IsString()
  receiver: string;
}