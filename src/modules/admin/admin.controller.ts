import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('accounts')
  @ApiOperation({
    summary: 'Get all accounts with pagination and role filtering',
    description:
      'Retrieve a paginated list of all users with optional role filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by user role',
    example: 'COMPETITOR',
    enum: ['COMPETITOR', 'EXAMINER', 'ADMIN', 'GUARDIAN', 'STAFF'],
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
              role: {
                type: 'string',
                enum: ['COMPETITOR', 'EXAMINER', 'ADMIN', 'GUARDIAN', 'STAFF'],
              },
              status: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              positionLevel: { type: 'string' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
            hasNextPage: { type: 'boolean' },
            hasPreviousPage: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getAllAccounts(
    @Query() paginationDto: PaginationDto,
    @Query('role') role?: string,
  ) {
    try {
      return this.adminService.getAllAccounts(paginationDto, role);
    } catch (error) {
      throw new Error(`Failed to retrieve accounts: ${error.message}`);
    }
  }

  @Patch('users/ban/:id')
  @ApiOperation({
    summary: 'Ban a user',
    description: 'Ban a user by their user ID',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'User ID to ban',
    example: 'uuid-string-here',
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
            status: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
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
    description: 'Activate a user by their user ID',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'User ID to activate',
    example: 'uuid-string-here',
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
            status: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  activateUser(@Param('id') id: string) {
    try {
      return this.adminService.activateUser(id);
    } catch (error) {
      throw new Error(`Failed to activate user: ${error.message}`);
    }
  }

  @Get('statistics/system')
  @ApiOperation({
    summary: 'Thống kê tổng quan toàn hệ thống',
    description:
      'Lấy thống kê tổng quan về users, contests, paintings, evaluations, votes và awards',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê hệ thống thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            users: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 150 },
                active: { type: 'number', example: 140 },
                inactive: { type: 'number', example: 10 },
                byRole: {
                  type: 'object',
                  properties: {
                    competitors: { type: 'number', example: 100 },
                    examiners: { type: 'number', example: 20 },
                    guardians: { type: 'number', example: 15 },
                    staffs: { type: 'number', example: 10 },
                    admins: { type: 'number', example: 5 },
                  },
                },
              },
            },
            contests: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 10 },
                active: { type: 'number', example: 2 },
                upcoming: { type: 'number', example: 3 },
                ended: { type: 'number', example: 3 },
                completed: { type: 'number', example: 2 },
              },
            },
            paintings: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 500 },
                approved: { type: 'number', example: 450 },
                pending: { type: 'number', example: 30 },
                rejected: { type: 'number', example: 20 },
              },
            },
            evaluations: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 1200 },
              },
            },
            votes: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 3500 },
              },
            },
            awards: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 50 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getSystemStatistics() {
    try {
      return this.adminService.getSystemStatistics();
    } catch (error) {
      throw new Error(`Failed to get system statistics: ${error.message}`);
    }
  }

  @Get('statistics/contest/:contestId')
  @ApiOperation({
    summary: 'Thống kê chi tiết theo cuộc thi',
    description:
      'Lấy thống kê chi tiết về submissions, participants, evaluations, votes và awards của một cuộc thi',
  })
  @ApiParam({
    name: 'contestId',
    required: true,
    type: Number,
    description: 'ID của cuộc thi cần thống kê',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê cuộc thi thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            contest: {
              type: 'object',
              properties: {
                contestId: { type: 'number', example: 1 },
                title: { type: 'string', example: 'Summer Art Contest 2025' },
                status: { type: 'string', example: 'ACTIVE' },
                startDate: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-01-01T00:00:00.000Z',
                },
                endDate: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-06-30T23:59:59.000Z',
                },
              },
            },
            submissions: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 200 },
                approved: { type: 'number', example: 180 },
                pending: { type: 'number', example: 15 },
                rejected: { type: 'number', example: 5 },
                byRound: {
                  type: 'object',
                  properties: {
                    round1: { type: 'number', example: 200 },
                    round2: { type: 'number', example: 50 },
                  },
                },
              },
            },
            participants: {
              type: 'object',
              properties: {
                totalCompetitors: { type: 'number', example: 150 },
              },
            },
            evaluations: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 500 },
              },
            },
            votes: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 1500 },
              },
            },
            awards: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 10 },
                awarded: { type: 'number', example: 8 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getContestStatistics(@Param('contestId') contestId: string) {
    try {
      return this.adminService.getContestStatistics(+contestId);
    } catch (error) {
      throw new Error(`Failed to get contest statistics: ${error.message}`);
    }
  }

  @Get('statistics/top-competitors')
  @ApiOperation({
    summary: 'Thống kê top competitors',
    description:
      'Lấy danh sách top competitors theo số bài dự thi và giải thưởng đạt được',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng competitors muốn lấy (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê top competitors thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              competitorId: {
                type: 'string',
                format: 'uuid',
                example: 'uuid-here',
              },
              fullName: { type: 'string', example: 'Nguyễn Văn A' },
              email: { type: 'string', example: 'competitor@example.com' },
              totalSubmissions: { type: 'number', example: 15 },
              awardsWon: { type: 'number', example: 3 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getTopCompetitors(@Query('limit') limit?: number) {
    try {
      return this.adminService.getTopCompetitors(limit || 10);
    } catch (error) {
      throw new Error(`Failed to get top competitors: ${error.message}`);
    }
  }

  @Get('statistics/top-examiners')
  @ApiOperation({
    summary: 'Thống kê top examiners',
    description: 'Lấy danh sách top examiners theo số lượng bài đã chấm',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng examiners muốn lấy (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê top examiners thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              examinerId: {
                type: 'string',
                format: 'uuid',
                example: 'uuid-here',
              },
              fullName: { type: 'string', example: 'Giám khảo ABC' },
              email: { type: 'string', example: 'examiner@example.com' },
              totalEvaluations: { type: 'number', example: 150 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getTopExaminers(@Query('limit') limit?: number) {
    try {
      return this.adminService.getTopExaminers(limit || 10);
    } catch (error) {
      throw new Error(`Failed to get top examiners: ${error.message}`);
    }
  }

  @Get('statistics/most-voted-paintings')
  @ApiOperation({
    summary: 'Thống kê paintings có nhiều votes nhất',
    description:
      'Lấy danh sách paintings có số lượng votes cao nhất trong hệ thống',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng paintings muốn lấy (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê paintings thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              paintingId: {
                type: 'string',
                format: 'uuid',
                example: 'uuid-here',
              },
              title: { type: 'string', example: 'Beautiful Sunset' },
              competitorName: { type: 'string', example: 'Nguyễn Văn A' },
              voteCount: { type: 'number', example: 350 },
              contestId: { type: 'number', example: 1 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getMostVotedPaintings(@Query('limit') limit?: number) {
    try {
      return this.adminService.getMostVotedPaintings(limit || 10);
    } catch (error) {
      throw new Error(`Failed to get most voted paintings: ${error.message}`);
    }
  }

  @Get('statistics/user-growth')
  @ApiOperation({
    summary: 'Thống kê tăng trưởng user theo thời gian',
    description:
      'Lấy thống kê số lượng user đăng ký theo thời gian với các filter khác nhau (ngày, tuần, tháng, năm)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Ngày bắt đầu (ISO format: YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Ngày kết thúc (ISO format: YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    type: String,
    description: 'Nhóm dữ liệu theo (day, week, month, year)',
    example: 'month',
    enum: ['day', 'week', 'month', 'year'],
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê tăng trưởng user thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalUsersInRange: {
                  type: 'number',
                  example: 250,
                  description: 'Tổng số user trong khoảng thời gian',
                },
                totalUsersCurrent: {
                  type: 'number',
                  example: 500,
                  description: 'Tổng số user hiện tại trong hệ thống',
                },
                startDate: { type: 'string', example: '2025-01-01' },
                endDate: { type: 'string', example: '2025-12-31' },
                groupBy: { type: 'string', example: 'month' },
              },
            },
            growth: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  period: {
                    type: 'string',
                    example: '2025-01',
                    description: 'Kỳ thời gian (format tùy theo groupBy)',
                  },
                  totalUsers: {
                    type: 'number',
                    example: 25,
                    description: 'Số user mới trong kỳ',
                  },
                  competitors: { type: 'number', example: 15 },
                  examiners: { type: 'number', example: 3 },
                  guardians: { type: 'number', example: 4 },
                  staffs: { type: 'number', example: 2 },
                  admins: { type: 'number', example: 1 },
                  cumulativeTotal: {
                    type: 'number',
                    example: 125,
                    description: 'Tổng tích lũy đến thời điểm này',
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getUserGrowthStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month' | 'year',
  ) {
    try {
      return this.adminService.getUserGrowthStatistics(
        startDate,
        endDate,
        groupBy || 'month',
      );
    } catch (error) {
      throw new Error(`Failed to get user growth statistics: ${error.message}`);
    }
  }
}
