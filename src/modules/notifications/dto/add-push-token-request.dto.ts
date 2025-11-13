import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddPushTokenRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
  })
  token_value: string;
}
