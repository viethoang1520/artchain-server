import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ContestsService } from './contests.service';
import { GetContestDto } from './dto/get-contest.dto';
import { ContestStatus } from './entities/contests.entity';

@ApiTags('Contests')
@Controller('api/contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all contests with pagination',
    description:
      'Retrieve a paginated list of contests. Can filter by status. Default: 10 items per page.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ContestStatus,
    description: 'Filter by contest status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page (max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Contests retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            contestId: 1,
            title: 'Art Competition 2025',
            description: 'A competition for young artists',
            status: 'ACTIVE',
            startDate: '2025-10-15T00:00:00.000Z',
            endDate: '2025-11-15T00:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
      },
    },
  })
  findAll(@Query() query: GetContestDto) {
    return this.contestsService.findAll(query);
  }

  @Get('examiner/:examinerId')
  findAllForExaminer(@Param('examinerId', ParseUUIDPipe) examinerId: string) {
    return this.contestsService.findAllForExaminer(examinerId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contestsService.findOne(id);
  }
}
