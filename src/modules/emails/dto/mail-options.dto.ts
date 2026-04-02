import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MailOptionsDto {
  @ApiPropertyOptional({
    description: 'Sender email address',
    example: 'admin@artchain.com',
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  from?: string;

  @ApiProperty({
    description: 'Array of recipient email addresses',
    example: ['user1@example.com', 'user2@example.com'],
    type: [String],
    format: 'email',
  })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  to: string[];

  @ApiProperty({
    description: 'Email subject',
    example: 'Welcome to ArtChain!',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Email content/body',
    example: 'Thank you for joining ArtChain. We are excited to have you!',
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({
    description: 'Email HTML content/body',
    example: '<p>Thank you for joining ArtChain.</p>',
  })
  @IsString()
  @IsOptional()
  html?: string;
}
