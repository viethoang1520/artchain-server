import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  account_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  message: string;
}
