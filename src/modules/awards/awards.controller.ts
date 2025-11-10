import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AwardsService } from './awards.service';
import { CreateAwardDto } from './dto/create-award.dto';
import { UpdateAwardDto } from './dto/update-award.dto';
import { CreateAwardsBatchDto } from './dto/create-awards-batch.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('Awards')
@Controller('api/awards')
@UseGuards(AuthGuard)
export class AwardsController {
  constructor(private readonly awardsService: AwardsService) {}

  @Post('batch')
  @ApiOperation({ summary: 'Create multiple awards at once' })
  @ApiResponse({
    status: 201,
    description: 'Awards created successfully',
    schema: {
      example: {
        success: true,
        message: '3 awards created successfully',
        data: [
          {
            awardId: 1,
            contestId: 1,
            name: 'First Prize',
            description: 'Best painting in the contest',
            rank: 1,
            quantity: 1,
            prize: 5000000,
            createdAt: '2025-11-02T12:00:00.000Z',
            updatedAt: '2025-11-02T12:00:00.000Z',
          },
          {
            awardId: 2,
            contestId: 1,
            name: 'Second Prize',
            description: 'Runner-up',
            rank: 2,
            quantity: 2,
            prize: 3000000,
            createdAt: '2025-11-02T12:00:00.000Z',
            updatedAt: '2025-11-02T12:00:00.000Z',
          },
        ],
        meta: {
          total: 2,
          contestIds: [1],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  createBatch(@Body() createAwardsBatchDto: CreateAwardsBatchDto) {
    return this.awardsService.createBatch(createAwardsBatchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all awards' })
  @ApiResponse({
    status: 200,
    description: 'List of all awards',
  })
  findAll() {
    return this.awardsService.findAll();
  }

  @Get('contest/:contestId')
  @ApiOperation({ summary: 'Get all awards for a specific contest' })
  @ApiParam({
    name: 'contestId',
    description: 'Contest ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of awards for the contest',
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  findByContestId(@Param('contestId', ParseIntPipe) contestId: number) {
    return this.awardsService.findByContestId(contestId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get award by ID' })
  @ApiParam({
    name: 'id',
    description: 'Award ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Award details',
  })
  @ApiResponse({
    status: 404,
    description: 'Award not found',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.awardsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an award' })
  @ApiParam({
    name: 'id',
    description: 'Award ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Award updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Award or Contest not found',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAwardDto: UpdateAwardDto,
  ) {
    return this.awardsService.update(id, updateAwardDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an award' })
  @ApiParam({
    name: 'id',
    description: 'Award ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Award deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Award not found',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.awardsService.remove(id);
  }
}
