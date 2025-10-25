import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('accounts')
  @ApiOperation({
    summary: 'Get all accounts with pagination and role filtering',
    description: 'Retrieve a paginated list of all users with optional role filtering'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by user role',
    example: 'COMPETITOR',
    enum: ['COMPETITOR', 'EXAMINER', 'ADMIN', 'GUARDIAN', 'STAFF']
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved accounts with pagination metadata',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              fullName: { type: 'string' },
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              role: { type: 'string', enum: ['COMPETITOR', 'EXAMINER', 'ADMIN', 'GUARDIAN', 'STAFF'] },
              status: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              positionLevel: { type: 'string' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
            hasNextPage: { type: 'boolean' },
            hasPreviousPage: { type: 'boolean' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  getAllAccounts(@Query() paginationDto: PaginationDto, @Query('role') role?: string) {
    try {
      return this.adminService.getAllAccounts(paginationDto, role);
    } catch (error) {
      throw new Error(`Failed to retrieve accounts: ${error.message}`);
    }
  }


  @Patch('users/ban/:id')
  @ApiOperation({
    summary: 'Ban a user',
    description: 'Ban a user by their user ID'
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'User ID to ban',
    example: 'uuid-string-here'
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully banned',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            status: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  banUser(@Param('id') id: string) {
    try {
      return this.adminService.banUser(id);
    } catch (error) {
      throw new Error(`Failed to ban user: ${error.message}`);
    }
  }

  @Patch('users/activate/:id')
  @ApiOperation({
    summary: 'Activate a user',
    description: 'Activate a user by their user ID'
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'User ID to activate',
    example: 'uuid-string-here'
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully activated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            status: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  activateUser(@Param('id') id: string) {
    try {
      return this.adminService.activateUser(id);
    } catch (error) {
      throw new Error(`Failed to activate user: ${error.message}`);
    }
  }
}
