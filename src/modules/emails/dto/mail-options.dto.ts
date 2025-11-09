import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MailOptionsDto {
  @ApiPropertyOptional({
    description: 'Sender email address',
    example: 'admin@artchain.com',
    format: 'email'
  })
  @IsEmail()
  @IsOptional()
  from?: string;

  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Welcome to ArtChain!'
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Email content/body',
    example: 'Thank you for joining ArtChain. We are excited to have you!'
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}
