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
  UploadedFiles,
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
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
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
import { ContestStatus } from '../contests/entities/contests.entity';
import { AssignAwardToPaintingDto } from './dto/assign-award-to-painting.dto';

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
        banner: {
          type: 'string',
          format: 'binary',
          description: 'Banner image file (optional)',
        },
        rule: {
          type: 'string',
          format: 'binary',
          description: 'Contest rules PDF file (optional)',
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
        round2Quantity: {
          type: 'number',
          example: 20,
          description: 'Number of competitors to advance to Round 2',
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
          enum: Object.values(ContestStatus),
          example: 'DRAFT',
        },

        roundName: {
          type: 'string',
          description: 'Round name (e.g., ROUND_1)',
          example: 'ROUND_1',
        },
        roundTable: {
          type: 'string',
          description: 'Round table name',
          example: 'paintings',
        },
        roundStartDate: {
          type: 'string',
          format: 'date-time',
          description: 'Round start date',
          example: '2025-10-15T00:00:00.000Z',
        },
        roundEndDate: {
          type: 'string',
          format: 'date-time',
          description: 'Round end date',
          example: '2025-10-30T00:00:00.000Z',
        },
        roundSubmissionDeadline: {
          type: 'string',
          format: 'date-time',
          description: 'Round submission deadline',
          example: '2025-10-28T00:00:00.000Z',
        },
        roundResultAnnounceDate: {
          type: 'string',
          format: 'date-time',
          description: 'Round result announcement date',
          example: '2025-10-31T00:00:00.000Z',
        },
        roundSendOriginalDeadline: {
          type: 'string',
          format: 'date-time',
          description: 'Round send original deadline',
          example: '2025-11-05T00:00:00.000Z',
        },
        roundStatus: {
          type: 'string',
          description: 'Round status',
          example: 'DRAFT',
        },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'banner', maxCount: 1 },
        { name: 'rule', maxCount: 1 },
      ],
      { storage: memoryStorage() },
    ),
  )
  async createContest(
    @UploadedFiles()
    files: { banner?: Express.Multer.File[]; rule?: Express.Multer.File[] },
    @Body() createContestDto: CreateContestDto,
    @Request() req: any,
  ) {
    const createdBy = req.user.sub || req.user.userId;
    const bannerFile = files?.banner?.[0];
    const ruleFile = files?.rule?.[0];

    let parsedDto = { ...createContestDto, createdBy };

    if (
      createContestDto['roundName'] ||
      createContestDto['roundTable'] ||
      createContestDto['roundStartDate']
    ) {
      parsedDto.rounds = [
        {
          name: createContestDto['roundName'],
          table: createContestDto['roundTable'],
          startDate: createContestDto['roundStartDate'],
          endDate: createContestDto['roundEndDate'],
          submissionDeadline: createContestDto['roundSubmissionDeadline'],
          resultAnnounceDate: createContestDto['roundResultAnnounceDate'],
          sendOriginalDeadline: createContestDto['roundSendOriginalDeadline'],
          status: createContestDto['roundStatus'] || 'DRAFT',
        },
      ];

      delete parsedDto['roundName'];
      delete parsedDto['roundTable'];
      delete parsedDto['roundStartDate'];
      delete parsedDto['roundEndDate'];
      delete parsedDto['roundSubmissionDeadline'];
      delete parsedDto['roundResultAnnounceDate'];
      delete parsedDto['roundSendOriginalDeadline'];
      delete parsedDto['roundStatus'];
    }

    return this.staffService.createContest(parsedDto, bannerFile, ruleFile);
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
      'Creates ROUND_2 rounds for a contest. Automatically gets all competitors with passed paintings (isPassed=true) and randomly distributes them into 4 tables (A, B, C, D). ROUND_2 takes place in one day, so startDate and endDate will be the same.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contest ID',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          format: 'date-time',
          description:
            'Date when ROUND_2 will take place (used for both startDate and endDate)',
          example: '2025-11-15T09:00:00.000Z',
        },
      },
      required: ['date'],
    },
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
    description:
      'Bad request - No passed paintings, not enough competitors, or invalid/missing date',
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  createRound2WithTables(
    @Param('id', ParseIntPipe) contestId: number,
    @Body('date') date: string,
    @Request() req: any,
  ) {
    return this.staffService.createRound2WithTables(contestId, date);
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
  @ApiOperation({
    summary: 'Get all rounds in a contest',
    description:
      'Get all rounds grouped by round name. ROUND_1 shows basic info, ROUND_2 shows all 4 tables with competitors.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved rounds',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            oneOf: [
              {
                type: 'object',
                description: 'ROUND_1 or other basic rounds',
                properties: {
                  roundId: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'ROUND_1' },
                  isRound2: { type: 'boolean', example: false },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  submissionDeadline: { type: 'string' },
                  resultAnnounceDate: { type: 'string' },
                  sendOriginalDeadline: { type: 'string' },
                  status: { type: 'string', example: 'ACTIVE' },
                  table: { type: 'string', example: 'paintings' },
                },
              },
              {
                type: 'object',
                description: 'ROUND_2 with tables',
                properties: {
                  name: { type: 'string', example: 'ROUND_2' },
                  isRound2: { type: 'boolean', example: true },
                  tables: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        roundId: { type: 'number', example: 5 },
                        table: { type: 'string', example: 'A' },
                        startDate: { type: 'string' },
                        endDate: { type: 'string' },
                        submissionDeadline: { type: 'string' },
                        resultAnnounceDate: { type: 'string' },
                        sendOriginalDeadline: { type: 'string' },
                        status: { type: 'string', example: 'DRAFT' },
                      },
                    },
                  },
                  totalTables: { type: 'number', example: 4 },
                },
              },
            ],
          },
        },
        meta: {
          type: 'object',
          properties: {
            contestId: { type: 'number', example: 1 },
            totalRounds: { type: 'number', example: 2 },
            roundTypes: {
              type: 'array',
              items: { type: 'string' },
              example: ['ROUND_1', 'ROUND_2'],
            },
          },
        },
      },
    },
  })
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

  @Post('paintings/:paintingId/award')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Assign award to a painting' })
  @ApiParam({
    name: 'paintingId',
    description: 'Painting ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Award assigned successfully',
    schema: {
      example: {
        success: true,
        message: 'Award assigned to painting successfully',
        data: {
          paintingId: '550e8400-e29b-41d4-a716-446655440000',
          awardId: 1,
          awardName: 'First Prize',
          awardRank: 1,
          awardPrize: 5000000,
        },
        meta: {
          currentAssignedCount: 1,
          maxQuantity: 3,
          remainingSlots: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Painting already has an award or award quantity limit reached',
  })
  @ApiResponse({
    status: 404,
    description: 'Painting or Award not found',
  })
  assignAwardToPainting(
    @Param('paintingId') paintingId: string,
    @Body() assignAwardDto: AssignAwardToPaintingDto,
    @Request() req: any,
  ) {
    return this.staffService.assignAwardToPainting(
      paintingId,
      assignAwardDto.awardId,
    );
  }

  @Delete('paintings/:paintingId/award')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Remove award from a painting' })
  @ApiParam({
    name: 'paintingId',
    description: 'Painting ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Award removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Award unassigned from painting successfully',
        data: {
          paintingId: '550e8400-e29b-41d4-a716-446655440000',
          previousAwardId: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Painting does not have any award assigned',
  })
  @ApiResponse({
    status: 404,
    description: 'Painting not found',
  })
  unassignAwardFromPainting(
    @Param('paintingId') paintingId: string,
    @Request() req: any,
  ) {
    return this.staffService.unassignAwardFromPainting(paintingId);
  }
}
