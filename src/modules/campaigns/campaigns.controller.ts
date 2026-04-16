import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiTags('Campaigns')
@Controller('api/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  @Get('')
  @ApiOperation({
    summary: 'Get all campaigns with pagination',
    description:
      'Get all campaigns with pagination and optional status filter (public endpoint)',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (default: 1)',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page (default: 10)',
    example: 10,
    required: false,
  })
  @ApiQuery({
    name: 'status',
    description:
      'Filter by status (optional). Values: ACTIVE, CLOSED, COMPLETED, DRAFT, CANCELLED',
    example: 'ACTIVE',
    required: false,
    enum: ['ACTIVE', 'CLOSED', 'COMPLETED', 'DRAFT', 'CANCELLED'],
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved campaigns',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              campaignId: { type: 'number', example: 1 },
              title: { type: 'string', example: 'Save the Ocean' },
              description: { type: 'string', example: 'Campaign description' },
              goalAmount: { type: 'number', example: 100000 },
              currentAmount: { type: 'number', example: 50000 },
              deadline: { type: 'string', example: '2025-12-31T00:00:00Z' },
              status: { type: 'string', example: 'ACTIVE' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  async getAllCampaigns(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    try {
      return await this.campaignsService.getAllCampaigns(
        page || 1,
        limit || 10,
        status,
      );
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Không thể lấy danh sách campaign');
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get campaign detail by ID',
    description:
      'Get detailed information of a specific campaign (public endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved campaign detail',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            campaignId: { type: 'number', example: 1 },
            title: { type: 'string', example: 'Save the Ocean' },
            description: {
              type: 'string',
              example: 'Campaign to clean up ocean pollution',
            },
            goalAmount: { type: 'number', example: 100000 },
            currentAmount: { type: 'number', example: 50000 },
            deadline: { type: 'string', example: '2025-12-31T00:00:00Z' },
            status: { type: 'string', example: 'ACTIVE' },
            staffId: { type: 'string', example: 'staff-uuid-123' },
            createdAt: { type: 'string', example: '2025-01-01T00:00:00Z' },
            updatedAt: { type: 'string', example: '2025-01-15T00:00:00Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Campaign not found',
  })
  async getCampaignDetail(@Param('id') id: number) {
    try {
      return await this.campaignsService.getCampaignDetail(id);
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Không thể lấy chi tiết campaign',
      );
    }
  }

  @Get(':id/sponsorship-tiers')
  @ApiOperation({
    summary: 'Get sponsorship tiers by campaign ID',
    description:
      'Lấy danh sách tier tài trợ (bronze/silver/gold/diamond) của một campaign',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tier tài trợ thành công',
  })
  async getSponsorshipTiersByCampaignId(@Param('id') id: number) {
    try {
      return await this.campaignsService.getCampaignSponsorshipTiers(id);
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Không thể lấy danh sách tier tài trợ của campaign',
      );
    }
  }

  @Get(':id/sponsors')
  @ApiOperation({
    summary: 'Get all sponsors in a campaign with pagination',
    description:
      'Get list of sponsors for a specific campaign with pagination and optional status filter (public endpoint)',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (default: 1)',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page (default: 10)',
    example: 10,
    required: false,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by status (optional). Values: PENDING, PAID',
    example: 'PAID',
    required: false,
    enum: ['PENDING', 'PAID'],
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved sponsors',
    schema: {
      type: 'object',
      properties: {
        data: {
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
                example: 'contact@abccorp.com',
              },
              sponsorshipAmount: { type: 'number', example: 10000 },
              campaignId: { type: 'number', example: 1 },
              status: { type: 'string', example: 'PAID' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Campaign not found',
  })
  async getSponsorsByCampaignId(
    @Param('id') id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    try {
      return await this.campaignsService.getSponsorsByCampaignId(
        id,
        page || 1,
        limit || 10,
        status,
      );
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Không thể lấy danh sách nhà tài trợ');
    }
  }
}
