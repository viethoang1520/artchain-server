import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StaffService } from './staffs.service';
import { CreateContestDto } from '../contests/dto/create-contest.dto';
import { UpdateContestDto } from '../contests/dto/update-contest.dto';
import { CreateRoundDto } from '../contests/dto/create-round.dto';
import { UpdateRoundDto } from '../contests/dto/update-round.dto';
import { CreateRound2Dto } from '../contests/dto/create-round2.dto';
import { ReviewSubmissionDto } from '../paintings/dto/review-submission.dto';
import { GetAllContestsDto } from '../contests/dto/get-all-contests.dto';
import { GetRoundsByContestDto } from '../contests/dto/get-rounds-by-contest.dto';
import { GetAllSubmissionsDto } from '../paintings/dto/get-all-submissions.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService } from '../posts/posts.service';
import { CreatePostDto } from '../posts/dto/create-post.dto';
import { UpdatePostDto } from '../posts/dto/update-post.dto';
import { GetAllPostsDto } from '../posts/dto/get-all-posts.dto';
import { CreateTagDto } from '../posts/dto/create-tag.dto';
import { AssignExaminerDto } from '../contests/dto/assign-examiner.dto';
import { CreateCampaignDto } from '../campaigns/dto/create-campaign.dto';
import { CreateScheduleDto } from '../schedules/dto/create-schedule.dto';
import { UpdateScheduleDto } from '../schedules/dto/update-schedule.dto';

@ApiTags('Staff Management')
@ApiBearerAuth()
@Controller('api/staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly postsService: PostsService,
  ) {}

  @Post('contests')
  @UseGuards(AuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Banner image file (optional)',
        },
        title: {
          type: 'string',
          example: 'Art Competition 2025',
        },
        description: {
          type: 'string',
          example: 'A competition for young artists',
        },
        numOfAward: {
          type: 'number',
          example: 3,
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-10-15T00:00:00.000Z',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-11-15T00:00:00.000Z',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ONGOING', 'ENDED'],
          example: 'DRAFT',
        },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async createContest(
    @UploadedFile() file: Express.Multer.File,
    @Body() createContestDto: CreateContestDto,
    @Request() req: any,
  ) {
    const createdBy = req.user.sub || req.user.userId;
    return this.staffService.createContest(
      { ...createContestDto, createdBy },
      file,
    );
  }

  @Put('contests/:id')
  @UseGuards(AuthGuard)
  updateContest(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContestDto: UpdateContestDto,
    @Request() req: any,
  ) {
    return this.staffService.updateContest(id, updateContestDto);
  }

  @Patch('contests/:id/publish')
  @UseGuards(AuthGuard)
  publishContest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.staffService.publishContest(id);
  }

  @Post('contests/:id/create-round2')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Create ROUND_2 with 4 tables for passed competitors',
    description:
      'Creates ROUND_2 rounds for a contest. Automatically gets all competitors with passed paintings (isPassed=true) and randomly distributes them into 4 tables (A, B, C, D)',
  })
  @ApiParam({
    name: 'id',
    description: 'Contest ID',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'ROUND_2 created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'ROUND_2 created successfully with 4 tables',
        },
        data: {
          type: 'object',
          properties: {
            rounds: {
              type: 'array',
              description: 'Array of 4 created rounds',
            },
            tableDistribution: {
              type: 'object',
              description:
                'Distribution of competitors across 4 tables with their IDs',
            },
            totalCompetitors: {
              type: 'number',
              example: 20,
              description: 'Total number of unique competitors',
            },
            passedPaintingsCount: {
              type: 'number',
              example: 25,
              description: 'Total number of passed paintings',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - No passed paintings or not enough competitors',
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  createRound2WithTables(
    @Param('id', ParseIntPipe) contestId: number,
    @Request() req: any,
  ) {
    return this.staffService.createRound2WithTables(contestId);
  }

  @Get('contests')
  @UseGuards(AuthGuard)
  getAllContests(@Query() queryDto: GetAllContestsDto, @Request() req: any) {
    return this.staffService.getAllContests(queryDto);
  }

  @Get('contests/submissions')
  @UseGuards(AuthGuard)
  getAllSubmissions(
    @Query() queryDto: GetAllSubmissionsDto,
    @Request() req?: any,
  ) {
    return this.staffService.getAllSubmissions(queryDto);
  }

  @Get('contests/submissions/pending')
  @UseGuards(AuthGuard)
  getPendingSubmissions(
    @Query('contestId') contestId?: number,
    @Query('roundId') roundId?: number,
    @Request() req?: any,
  ) {
    // Convert string to number if provided
    const parsedContestId = contestId ? Number(contestId) : undefined;
    const parsedRoundId = roundId ? Number(roundId) : undefined;
    return this.staffService.getPendingSubmissions(
      parsedContestId,
      parsedRoundId,
    );
  }

  @Get('contests/submissions/:paintingId')
  @UseGuards(AuthGuard)
  getSubmission(@Param('paintingId') paintingId: string, @Request() req: any) {
    return this.staffService.getSubmission(paintingId);
  }

  @Patch('contests/submissions/:paintingId/review')
  @UseGuards(AuthGuard)
  reviewSubmission(
    @Param('paintingId') paintingId: string,
    @Body() reviewDto: ReviewSubmissionDto,
    @Request() req: any,
  ) {
    return this.staffService.reviewSubmission(paintingId, reviewDto);
  }

  @Patch('contests/submissions/:paintingId/accept')
  @UseGuards(AuthGuard)
  acceptSubmission(
    @Param('paintingId') paintingId: string,
    @Request() req: any,
  ) {
    return this.staffService.acceptSubmission(paintingId);
  }

  @Patch('contests/submissions/:paintingId/reject')
  @UseGuards(AuthGuard)
  rejectSubmission(
    @Param('paintingId') paintingId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.staffService.rejectSubmission(paintingId, reason);
  }

  @Post('posts')
  @UseGuards(AuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for the post (optional)',
        },
        title: {
          type: 'string',
          description: 'Title of the post',
          example: 'Introduction to NestJS',
        },
        content: {
          type: 'string',
          description: 'Content of the post',
          example: 'This is a comprehensive guide to NestJS framework...',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED'],
          description: 'Status of the post',
          example: 'DRAFT',
        },
        tag_ids: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Array of tag IDs',
          example: [1, 2, 3],
        },
      },
      required: ['title', 'content'],
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async createPost(
    @UploadedFile() file: Express.Multer.File,
    @Body() createPostDto: CreatePostDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.sub || req.user.userId;
      return await this.postsService.createPost(
        {
          ...createPostDto,
          account_id: createPostDto.account_id || userId,
        },
        file,
      );
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create post');
    }
  }

  @Get('posts')
  @UseGuards(AuthGuard)
  getAllPosts(@Query() queryDto: GetAllPostsDto, @Request() req: any) {
    return this.postsService.getAllPosts(queryDto);
  }

  @Get('posts/:id')
  @UseGuards(AuthGuard)
  getPostById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.postsService.getPostById(id);
  }

  @Put('posts/:id')
  @UseGuards(AuthGuard)
  updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req: any,
  ) {
    return this.postsService.updatePost(id, updatePostDto);
  }

  @Delete('posts/:id')
  @UseGuards(AuthGuard)
  softDeletePost(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.postsService.softDeletePost(id);
  }

  @Post('posts/:id/restore')
  @UseGuards(AuthGuard)
  restorePost(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.postsService.restorePost(id);
  }

  @Post('posts/:id/publish')
  @UseGuards(AuthGuard)
  publishPost(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.postsService.publishPost(id);
  }

  @Post('tags')
  @UseGuards(AuthGuard)
  createTag(@Body() createTagDto: CreateTagDto, @Request() req: any) {
    return this.postsService.createTag(createTagDto.tag_name);
  }

  @Get('tags')
  @UseGuards(AuthGuard)
  getAllTags(@Request() req: any) {
    return this.postsService.getAllTags();
  }

  @Delete('tags/:id')
  @UseGuards(AuthGuard)
  deleteTag(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.postsService.deleteTag(id);
  }

  @Get('contests/:id')
  @UseGuards(AuthGuard)
  getContest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.staffService.getContest(id);
  }

  @Post('contests/:contestId/rounds')
  @UseGuards(AuthGuard)
  createRound(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Body() createRoundDto: CreateRoundDto,
    @Request() req: any,
  ) {
    return this.staffService.createRound(contestId, createRoundDto);
  }

  @Get('contests/:contestId/rounds')
  @UseGuards(AuthGuard)
  getRoundsByContest(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Query() queryDto: PaginationDto,
    @Request() req: any,
  ) {
    return this.staffService.getRoundsByContest(contestId, queryDto);
  }

  @Get('contests/:contestId/rounds/detail')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get round detail by name',
    description:
      'Get round details by name. For ROUND_2, it will also include tables (A, B, C, D) and competitors in each table.',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description:
      'Filter by round name (e.g., "ROUND_1", "ROUND_2"). Required parameter.',
    example: 'ROUND_2',
  })
  getRoundByName(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Query('name') name: string,
    @Request() req?: any,
  ) {
    return this.staffService.getRoundByName(contestId, name);
  }

  @Get('contests/:contestId/rounds/:roundId')
  @UseGuards(AuthGuard)
  getRound(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('roundId', ParseIntPipe) roundId: number,
    @Request() req?: any,
  ) {
    return this.staffService.getRoundById(contestId, roundId);
  }

  @Patch('contests/:contestId/rounds/:roundId')
  @UseGuards(AuthGuard)
  updateRound(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() updateRoundDto: UpdateRoundDto,
    @Request() req: any,
  ) {
    return this.staffService.updateRound(contestId, roundId, updateRoundDto);
  }

  @Delete('contests/:contestId/rounds/:roundId')
  @UseGuards(AuthGuard)
  deleteRound(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('roundId', ParseIntPipe) roundId: number,
    @Request() req: any,
  ) {
    return this.staffService.deleteRound(contestId, roundId);
  }

  @Post('contests/:contestId/examiners')
  @UseGuards(AuthGuard)
  assignExaminerToContest(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Body() assignExaminerDto: AssignExaminerDto,
    @Request() req: any,
  ) {
    return this.staffService.assignExaminerToContest(
      contestId,
      assignExaminerDto,
    );
  }

  @Get('contests/:contestId/examiners')
  @UseGuards(AuthGuard)
  getExaminersByContest(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Request() req: any,
  ) {
    return this.staffService.getExaminersByContest(contestId);
  }

  @Delete('contests/:contestId/examiners/:examinerId')
  @UseGuards(AuthGuard)
  removeExaminerFromContest(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('examinerId') examinerId: string,
    @Request() req: any,
  ) {
    return this.staffService.removeExaminerFromContest(contestId, examinerId);
  }

  @Post('campaign')
  @UseGuards(AuthGuard)
  createCampaign(
    @Body() createCampaignDto: CreateCampaignDto,
    @Request() req: any,
  ) {
    const staffId = req.user.sub || req.user.userId;
    return this.staffService.createCampaign({ createCampaignDto, staffId });
  }

  @Get('examiners')
  @UseGuards(AuthGuard)
  getAllExaminers(@Request() req: any) {
    return this.staffService.getAllExaminers();
  }

  @Post('schedules')
  @UseGuards(AuthGuard)
  createSchedule(
    @Body() createScheduleDto: CreateScheduleDto,
    @Request() req: any,
  ) {
    return this.staffService.createSchedule(createScheduleDto);
  }

  @Get('schedules/examiner/:examinerId')
  @UseGuards(AuthGuard)
  getSchedulesByExaminer(
    @Param('examinerId') examinerId: string,
    @Request() req: any,
  ) {
    return this.staffService.getSchedulesByExaminer(examinerId);
  }

  @Get('schedules/contest/:contestId')
  @UseGuards(AuthGuard)
  getSchedulesByContest(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Request() req: any,
  ) {
    return this.staffService.getSchedulesByContest(contestId);
  }

  @Put('schedules/:scheduleId')
  @UseGuards(AuthGuard)
  updateSchedule(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Request() req: any,
  ) {
    return this.staffService.updateSchedule(scheduleId, updateScheduleDto);
  }

  @Delete('schedules/:scheduleId')
  @UseGuards(AuthGuard)
  deleteSchedule(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Request() req: any,
  ) {
    return this.staffService.deleteSchedule(scheduleId);
  }
}
