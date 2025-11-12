import { ApiProperty } from '@nestjs/swagger';
import { IsJSON, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PushNotificationRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  body: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  url?: string;

  @IsJSON()
  @IsOptional()
  @ApiProperty()
  data?: Object;
}
