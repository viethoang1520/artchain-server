import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSponsorDto {
  @ApiProperty({
    description: 'Sponsor name',
    example: 'ABC Corporation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Sponsor contact information',
    example: 'contact@abccorp.com | +1-555-0123',
    required: false,
  })
  @IsString()
  @IsOptional()
  contactInfo?: string;

  @ApiProperty({
    description: 'Sponsorship amount',
    example: 10000.0,
    type: 'number',
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  sponsorshipAmount?: number;

  @ApiProperty({
    description: 'Campaign ID that this sponsor is associated with',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  campaignId?: number;
  // })
  // @IsNumber()
  // @IsPositive()
  // @IsOptional()
  // @Type(() => Number)
  // contestId?: number;
}
