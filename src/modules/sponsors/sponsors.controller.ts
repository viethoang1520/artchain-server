import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { SponsorsService } from './sponsors.service';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('Sponsors')
@Controller('api/sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) { }

  @Get('')
  @ApiOperation({
    summary: 'Get all sponsors',
    description:
      'Get all sponsors (public endpoint, no authentication required)',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by status (optional). Values: PENDING or PAID',
    example: 'PENDING',
    required: false,
    enum: ['PENDING', 'PAID'],
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all sponsors',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sponsorId: { type: 'number', example: 1 },
          name: { type: 'string', example: 'ABC Corporation' },
          logoUrl: {
            type: 'string',
            example: 'https://storage.googleapis.com/...',
          },
          contactInfo: {
            type: 'string',
            example: 'contact@abccorp.com | +1-555-0123',
          },
          sponsorshipAmount: { type: 'number', example: 10000.0 },
          campaignId: { type: 'number', example: 1 },
          status: { type: 'string', example: 'PENDING' },
        },
      },
    },
  })
  async getAllSponsors(@Query('status') status?: string) {
    try {
      return await this.sponsorsService.getAllSponsors(status);
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Không thể lấy danh sách nhà tài trợ');
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get sponsor detail by ID',
    description:
      'Get detailed information of a specific sponsor (public endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved sponsor detail',
    schema: {
      type: 'object',
      properties: {
        sponsorId: { type: 'number', example: 1 },
        name: { type: 'string', example: 'ABC Corporation' },
        logoUrl: {
          type: 'string',
          example: 'https://storage.googleapis.com/...',
        },
        contactInfo: {
          type: 'string',
          example: 'contact@abccorp.com | +1-555-0123',
        },
        sponsorshipAmount: { type: 'number', example: 10000.0 },
        campaignId: { type: 'number', example: 1 },
        status: { type: 'string', example: 'PENDING' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Sponsor not found',
  })
  async getSponsorById(@Param('id') id: number) {
    try {
      return await this.sponsorsService.getSponsorById(id);
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Không thể lấy chi tiết nhà tài trợ',
      );
    }
  }

  @Post('')
  @ApiOperation({
    summary: 'Create a new sponsor with logo upload and payment',
    description:
      'Create a new sponsor with optional logo file upload to Firebase Storage',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Logo file (optional)',
        },
        name: {
          type: 'string',
          description: 'Sponsor name',
          example: 'ABC Corporation',
        },
        contactInfo: {
          type: 'string',
          description: 'Contact information',
          example: 'contact@abccorp.com | +1-555-0123',
        },
        sponsorshipAmount: {
          type: 'number',
          description: 'Sponsorship amount',
          example: 10000.0,
        },
        campaignId: {
          type: 'integer',
          description: 'Campaign ID',
          example: 1,
        },
      },
      required: ['name', 'campaignId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Sponsor successfully created',
    schema: {
      type: 'object',
      properties: {
        sponsorId: { type: 'number', example: 1 },
        name: { type: 'string', example: 'ABC Corporation' },
        logoUrl: {
          type: 'string',
          example: 'https://storage.googleapis.com/...',
        },
        contactInfo: {
          type: 'string',
          example: 'contact@abccorp.com | +1-555-0123',
        },
        sponsorshipAmount: { type: 'number', example: 10000.0 },
        campaignId: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or campaign not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async createSponsor(
    @UploadedFile() file: Express.Multer.File,
    @Body() createSponsorDto: CreateSponsorDto,
  ) {
    try {
      return await this.sponsorsService.createSponsor(createSponsorDto, file);
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Không thể tạo mới nhà tài trợ',
      );
    }
  }
}
