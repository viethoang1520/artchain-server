import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  account_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  message: string;
}
