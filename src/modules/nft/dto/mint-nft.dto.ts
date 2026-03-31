import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class MintNftDto {
  @ApiProperty()
  @IsString()
  receiver: string;

  @ApiProperty()
  @IsUUID()
  paintingId: string;
}
