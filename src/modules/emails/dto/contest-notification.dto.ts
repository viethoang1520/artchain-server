import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContestNotificationDto {
  @ApiProperty({
    description: 'Email address of the recipient who will receive the contest notification',
    example: 'participant@example.com',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;
}