import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AwardsService } from './awards.service';
import { CreateAwardDto } from './dto/create-award.dto';
import { UpdateAwardDto } from './dto/update-award.dto';

@ApiTags('Awards')
@Controller('api/awards')
export class AwardsController {
  constructor(private readonly awardsService: AwardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new award' })
  @ApiResponse({
    status: 201,
    description: 'Award created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  create(@Body() createAwardDto: CreateAwardDto) {
    return this.awardsService.create(createAwardDto);
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
