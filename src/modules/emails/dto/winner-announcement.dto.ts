import { IsArray, IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WinnerAnnouncementDto {
  @ApiProperty({
    description: 'Name of the contest for which winners are being announced',
    example: 'ArtChain Digital Art Contest 2025'
  })
  @IsString()
  @IsNotEmpty()
  contestName: string;

  @ApiProperty({
    description: 'Array of email addresses of contest winners',
    example: ['winner1@example.com', 'winner2@example.com', 'winner3@example.com'],
    type: [String],
    format: 'email'
  })
  @IsArray()
  @IsEmail({}, { each: true })
  winnerEmails: string[];
}