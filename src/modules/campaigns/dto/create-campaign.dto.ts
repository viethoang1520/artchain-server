import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignStatus } from '../../campaigns/entities/campaign.entity';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign title',
    example: 'Art Contest Fundraising 2025'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Campaign description and goals',
    example: 'Fundraising campaign to support young artists in the annual art contest',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Target amount to raise',
    example: 50000.00,
    type: 'number'
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  goalAmount: number;

  @ApiProperty({
    description: 'Campaign deadline',
    example: '2025-12-31T23:59:59.000Z',
    type: 'string',
    format: 'date-time'
  })
  @IsDateString()
  deadline: string;

  @ApiProperty({
    description: 'Campaign status',
    enum: CampaignStatus,
    example: CampaignStatus.DRAFT,
    required: false
  })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiProperty({
    description: 'Minimum sponsorship amount for Bronze tier',
    example: 500000,
    type: 'number',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  bronzeMinPrice: number;

  @ApiProperty({
    description: 'Minimum sponsorship amount for Silver tier',
    example: 1000000,
    type: 'number',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  silverMinPrice: number;

  @ApiProperty({
    description: 'Minimum sponsorship amount for Gold tier',
    example: 2000000,
    type: 'number',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  goldMinPrice: number;

  @ApiProperty({
    description: 'Minimum sponsorship amount for Diamond tier',
    example: 5000000,
    type: 'number',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  diamondMinPrice: number;

  // @ApiProperty({
  //   description: 'ID of the staff member creating the campaign',
  //   example: 'uuid-staff-id-here'
  // })
  // @IsString()
  // @IsNotEmpty()
  // staffId: string;
}