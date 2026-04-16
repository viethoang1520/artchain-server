import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignStatus } from '../../campaigns/entities/campaign.entity';

export class CreateCampaignTierDto {
  @ApiProperty({
    description: 'ID của tier',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  tierId: number;

  @ApiProperty({
    description: 'Mức tài trợ tối thiểu của tier',
    example: 500000,
    type: 'number',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  minPrice: number;
}

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
    description: 'Danh sách các tier và mức tài trợ tối thiểu cho campaign',
    type: [CreateCampaignTierDto],
    example: [
      { tierId: 1, minPrice: 500000 },
      { tierId: 2, minPrice: 1000000 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCampaignTierDto)
  tiers: CreateCampaignTierDto[];

  // @ApiProperty({
  //   description: 'ID of the staff member creating the campaign',
  //   example: 'uuid-staff-id-here'
  // })
  // @IsString()
  // @IsNotEmpty()
  // staffId: string;
}