import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SponsorsService } from './sponsors.service';
import { CreateSponsorDto } from './dto/create-sponsor.dto';

@ApiTags('Sponsors')
@Controller('api/sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) { }

  @Post('')
  @ApiOperation({
    summary: 'Create a new sponsor',
    description: 'Create a new sponsor with sponsorship details and contest association'
  })
  @ApiBody({
    type: CreateSponsorDto,
    description: 'Sponsor creation data'
  })
  @ApiResponse({
    status: 201,
    description: 'Sponsor successfully created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Sponsor created successfully' },
        data: {
          type: 'object',
          properties: {
            sponsorId: { type: 'number', example: 1 },
            name: { type: 'string', example: 'ABC Corporation' },
            logoUrl: { type: 'string', example: 'https://example.com/logo.png' },
            contactInfo: { type: 'string', example: 'contact@abccorp.com | +1-555-0123' },
            sponsorshipAmount: { type: 'number', example: 10000.00 },
            contestId: { type: 'number', example: 1 }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  createSponsor(@Body() createSponsorDto: CreateSponsorDto) {
    try {
      return this.sponsorsService.createSponsor(createSponsorDto);
    } catch (error) {
      return { message: 'Error occurred while creating sponsor' };
    }
  }
}
