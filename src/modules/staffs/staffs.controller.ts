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
  ParseUUIDPipe,
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
import { ReviewSubmissionDto } from '../paintings/dto/review-submission.dto';
import { GetAllContestsDto } from '../contests/dto/get-all-contests.dto';
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
import { UpdateCampaignDto } from '../campaigns/dto/update-campaign.dto';
import { CreateScheduleDto } from '../schedules/dto/create-schedule.dto';
import { UpdateScheduleDto } from '../schedules/dto/update-schedule.dto';
import { ContestStatus } from '../contests/entities/contests.entity';
import { AssignAwardToPaintingDto } from './dto/assign-award-to-painting.dto';
import { AcceptMultipleSubmissionsDto } from './dto/accept-multiple-submissions.dto';
import { UpdateOriginalSubmissionStatusDto } from './dto/update-original-submission-status.dto';
import { QueryWithdrawRequestDto } from '../wallets/dto/query-withdraw-request.dto';
import { ApproveWithdrawRequestDto } from '../wallets/dto/approve-withdraw-request.dto';
import { RejectWithdrawRequestDto } from '../wallets/dto/reject-withdraw-request.dto';

@ApiTags('Staff Management')
@ApiBearerAuth()
@Controller('api/staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly postsService: PostsService,
  ) { }

  @Get('wallet-withdraw-requests')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Staff xem danh sách yêu cầu rút tiền ví' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getWalletWithdrawRequests(
    @Request() req: any,
    @Query() queryDto: QueryWithdrawRequestDto,
  ) {
    const staffId = req.user.sub || req.user.userId;
    return this.staffService.getWithdrawRequests(staffId, queryDto);
  }

  @Patch('wallet-withdraw-requests/:requestId/approve')
  @UseGuards(AuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Staff duyệt yêu cầu rút tiền ví' })
  @ApiParam({ name: 'requestId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        proofImage: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh chứng từ chuyển khoản',
        },
        proofImageUrl: {
          type: 'string',
          description: 'URL ảnh chứng từ (khi không upload file)',
          example: 'https://cdn.example.com/proofs/withdraw-1.jpg',
        },
        staffNote: {
          type: 'string',
          description: 'Ghi chú của staff',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Duyệt yêu cầu thành công' })
  @UseInterceptors(FileInterceptor('proofImage', { storage: memoryStorage() }))
  async approveWalletWithdrawRequest(
    @Request() req: any,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() approveDto: ApproveWithdrawRequestDto,
    @UploadedFile() proofImage?: Express.Multer.File,
  ) {
    const staffId = req.user.sub || req.user.userId;

    const nextApproveDto: ApproveWithdrawRequestDto = { ...approveDto };

    if (proofImage) {
      nextApproveDto.proofImageUrl =
        await this.staffService.uploadWithdrawProofImage(proofImage);
    }

    if (!nextApproveDto.proofImageUrl) {
      throw new BadRequestException(
        'Vui lòng upload ảnh chứng từ hoặc truyền proofImageUrl',
      );
    }

    return this.staffService.approveWithdrawRequest(
      staffId,
      requestId,
      nextApproveDto,
    );
  }

  @Patch('wallet-withdraw-requests/:requestId/reject')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Staff từ chối yêu cầu rút tiền ví và hoàn tiền',
  })
  @ApiParam({ name: 'requestId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Từ chối yêu cầu thành công' })
  rejectWalletWithdrawRequest(
    @Request() req: any,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() rejectDto: RejectWithdrawRequestDto,
  ) {
    const staffId = req.user.sub || req.user.userId;
    return this.staffService.rejectWithdrawRequest(
      staffId,
      requestId,
      rejectDto,
    );
  }

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
        numberOfTablesRound2: {
          type: 'number',
          example: 4,
          description:
            'Number of tables for Round 2 (default: 4, min: 2, max: 26)',
          minimum: 2,
          maximum: 26,
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
  @ApiOperation({
    summary: 'Cập nhật thông tin cuộc thi và Round 1',
    description:
      'Cập nhật thông tin contest và Round 1. CHỈ cho phép cập nhật khi contest ở trạng thái DRAFT. Sau khi publish sẽ KHÔNG thể cập nhật nữa. Có thể upload file banner và rule mới. Nếu không upload file mới, giữ nguyên URL cũ.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          example: 'Updated Art Competition 2025',
        },
        description: {
          type: 'string',
          example: 'Updated description',
        },
        round2Quantity: {
          type: 'number',
          example: 24,
        },
        numberOfTablesRound2: {
          type: 'number',
          example: 4,
          description: 'Number of tables for Round 2 (min: 2, max: 26)',
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
        banner: {
          type: 'string',
          format: 'binary',
          description: 'Banner image file (optional - only if updating)',
        },
        rule: {
          type: 'string',
          format: 'binary',
          description: 'Rule PDF file (optional - only if updating)',
        },
        roundStartDate: {
          type: 'string',
          format: 'date-time',
          description: 'Round 1 start date (optional)',
          example: '2025-10-15T00:00:00.000Z',
        },
        roundEndDate: {
          type: 'string',
          format: 'date-time',
          description: 'Round 1 end date (optional)',
          example: '2025-10-30T00:00:00.000Z',
        },
        roundSubmissionDeadline: {
          type: 'string',
          format: 'date-time',
          description: 'Round 1 submission deadline (optional)',
          example: '2025-10-28T00:00:00.000Z',
        },
        roundResultAnnounceDate: {
          type: 'string',
          format: 'date-time',
          description: 'Round 1 result announcement date (optional)',
          example: '2025-10-31T00:00:00.000Z',
        },
        roundSendOriginalDeadline: {
          type: 'string',
          format: 'date-time',
          description: 'Round 1 send original deadline (optional)',
          example: '2025-11-05T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Contest updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Contest has been published and cannot be updated. Only DRAFT contests can be updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
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
  updateContest(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles()
    files: { banner?: Express.Multer.File[]; rule?: Express.Multer.File[] },
    @Body() updateContestDto: UpdateContestDto,
    @Request() req: any,
  ) {
    const bannerFile = files?.banner?.[0];
    const ruleFile = files?.rule?.[0];

    // Parse round data if provided
    let parsedDto = { ...updateContestDto };

    if (
      updateContestDto['roundName'] ||
      updateContestDto['roundStartDate'] ||
      updateContestDto['roundEndDate']
    ) {
      parsedDto.rounds = [
        {
          name: updateContestDto['roundName'],
          table: updateContestDto['roundTable'],
          startDate: updateContestDto['roundStartDate'],
          endDate: updateContestDto['roundEndDate'],
          submissionDeadline: updateContestDto['roundSubmissionDeadline'],
          resultAnnounceDate: updateContestDto['roundResultAnnounceDate'],
          sendOriginalDeadline: updateContestDto['roundSendOriginalDeadline'],
          status: updateContestDto['roundStatus'],
        },
      ];

      // Clean up round fields from DTO
      delete parsedDto['roundName'];
      delete parsedDto['roundTable'];
      delete parsedDto['roundStartDate'];
      delete parsedDto['roundEndDate'];
      delete parsedDto['roundSubmissionDeadline'];
      delete parsedDto['roundResultAnnounceDate'];
      delete parsedDto['roundSendOriginalDeadline'];
      delete parsedDto['roundStatus'];
    }

    return this.staffService.updateContest(id, parsedDto, bannerFile, ruleFile);
  }

  @Patch('contests/:id/publish')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Publish contest',
    description:
      'Publish a contest from DRAFT status. After publishing, the contest configuration will be LOCKED and cannot be updated anymore. Status will change to UPCOMING, ACTIVE, or ENDED based on current date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contest published successfully. Configuration is now locked.',
    schema: {
      example: {
        success: true,
        message:
          'Contest published successfully with status: UPCOMING. Contest configuration is now locked and cannot be updated.',
        data: {
          contestId: 1,
          title: 'Art Competition 2025',
          status: 'UPCOMING',
          numberOfTablesRound2: 4,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Contest can only be published from DRAFT status, or invalid configuration (e.g., numberOfTablesRound2 out of range).',
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  publishContest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.staffService.publishContest(id);
  }

  @Patch('contests/:id/schedule-enforcement')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Bật/tắt ràng buộc lịch chấm của contest',
    description: `
- **true**: Examiner chỉ có thể chấm bài vào đúng ngày được phân công trong schedule
- **false**: Examiner có thể chấm bài bất cứ lúc nào (dùng cho demo hoặc testing)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      example: {
        success: true,
        message:
          'Schedule enforcement has been enabled. Examiners can only evaluate on their scheduled dates.',
        data: {
          contestId: 1,
          isScheduleEnforced: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  toggleScheduleEnforcement(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.staffService.toggleScheduleEnforcement(id);
  }

  @Post('contests/:id/create-round2')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Create ROUND_2 with configurable number of tables',
    description:
      'Creates ROUND_2 rounds for a contest. Automatically gets all competitors with passed paintings and distributes them into specified number of tables (default 4). Uses seeding method based on ROUND_1 scores. ROUND_2 takes place in one day, so startDate and endDate will be the same.',
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
        numberOfTables: {
          type: 'number',
          description:
            'Number of tables to create (default: 4). Must be between 2 and 26.',
          example: 4,
          minimum: 2,
          maximum: 26,
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
              description: 'Array of created rounds',
            },
            tableDistribution: {
              type: 'object',
              description:
                'Distribution of competitors across tables with their IDs',
            },
            numberOfTables: {
              type: 'number',
              example: 4,
              description: 'Number of tables created',
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
    @Body('numberOfTables') numberOfTables?: number,
    @Request() req?: any,
  ) {
    return this.staffService.createRound2WithTables(
      contestId,
      date,
      numberOfTables,
    );
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

  // @Patch('contests/submissions/:paintingId/accept')
  // @UseGuards(AuthGuard)
  // @ApiOperation({
  //   summary: 'Accept single submission (deprecated - use batch endpoint)',
  //   description:
  //     'Accept a single painting submission. Consider using the batch endpoint for better performance.',
  // })
  // acceptSubmission(
  //   @Param('paintingId') paintingId: string,
  //   @Request() req: any,
  // ) {
  //   return this.staffService.acceptSubmission(paintingId);
  // }

  @Patch('contests/submissions/accept')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Accept multiple submissions at once',
    description:
      'Accept multiple painting submissions in a single request. Returns summary of successful and failed operations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Submissions processed successfully',
    schema: {
      example: {
        success: true,
        message: 'Processed 5 submissions: 4 accepted, 1 failed',
        data: {
          successful: [
            {
              paintingId: '550e8400-e29b-41d4-a716-446655440000',
              status: 'ACCEPTED',
            },
          ],
          failed: [
            {
              paintingId: '550e8400-e29b-41d4-a716-446655440001',
              error: 'Painting not found',
            },
          ],
        },
        meta: {
          total: 5,
          successCount: 4,
          failureCount: 1,
        },
      },
    },
  })
  acceptMultipleSubmissions(
    @Body() acceptMultipleDto: AcceptMultipleSubmissionsDto,
    @Request() req: any,
  ) {
    return this.staffService.acceptMultipleSubmissions(
      acceptMultipleDto.paintingIds,
    );
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
  @ApiOperation({
    summary: 'Tạo campaign mới',
    description: 'Staff tạo campaign mới với thông tin và có thể upload ảnh',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Campaign image file (optional - JPG, PNG, etc.)',
        },
        title: {
          type: 'string',
          description: 'Campaign title',
          example: 'Art Contest Fundraising 2025',
        },
        description: {
          type: 'string',
          description: 'Campaign description and goals',
          example: 'Fundraising campaign to support young artists',
        },
        goalAmount: {
          type: 'number',
          description: 'Target amount to raise',
          example: 50000,
        },
        deadline: {
          type: 'string',
          format: 'date-time',
          description: 'Campaign deadline',
          example: '2025-12-31T23:59:59.000Z',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'CLOSED', 'COMPLETED', 'DRAFT', 'CANCELLED'],
          description: 'Campaign status',
          example: 'DRAFT',
        },
        bronzeMinPrice: {
          type: 'number',
          description: 'Minimum sponsorship amount for Bronze tier',
          example: 500000,
        },
        silverMinPrice: {
          type: 'number',
          description: 'Minimum sponsorship amount for Silver tier',
          example: 1000000,
        },
        goldMinPrice: {
          type: 'number',
          description: 'Minimum sponsorship amount for Gold tier',
          example: 2000000,
        },
        diamondMinPrice: {
          type: 'number',
          description: 'Minimum sponsorship amount for Diamond tier',
          example: 5000000,
        },
      },
      required: [
        'title',
        'goalAmount',
        'deadline',
        'bronzeMinPrice',
        'silverMinPrice',
        'goldMinPrice',
        'diamondMinPrice',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Campaign created successfully',
    schema: {
      example: {
        success: true,
        message: 'Campaign created successfully',
        data: {
          campaignId: 1,
          title: 'Art Contest Fundraising 2025',
          description: 'Fundraising campaign...',
          image: 'https://storage.googleapis.com/.../campaigns/...',
          goalAmount: 50000,
          currentAmount: 0,
          deadline: '2025-12-31T23:59:59.000Z',
          status: 'DRAFT',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  createCampaign(
    @Body() createCampaignDto: CreateCampaignDto,
    @UploadedFile() image?: Express.Multer.File,
    @Request() req?: any,
  ) {
    const staffId = req.user.sub || req.user.userId;
    return this.staffService.createCampaign({
      createCampaignDto,
      staffId,
      imageFile: image,
    });
  }

  @Put('campaign/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Cập nhật campaign',
    description:
      'Staff cập nhật thông tin campaign và có thể upload ảnh mới. Tất cả fields đều optional, chỉ cập nhật field nào được gửi lên.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Campaign image file (optional - JPG, PNG, etc.)',
        },
        title: {
          type: 'string',
          description: 'Campaign title',
          example: 'Updated Art Contest Fundraising 2025',
        },
        description: {
          type: 'string',
          description: 'Campaign description and goals',
          example: 'Updated fundraising campaign description',
        },
        goalAmount: {
          type: 'number',
          description: 'Target amount to raise',
          example: 60000,
        },
        deadline: {
          type: 'string',
          format: 'date-time',
          description: 'Campaign deadline',
          example: '2025-12-31T23:59:59.000Z',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'CLOSED', 'COMPLETED', 'DRAFT', 'CANCELLED'],
          description: 'Campaign status',
          example: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Campaign updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Campaign updated successfully',
        data: {
          campaignId: 1,
          title: 'Updated Art Contest Fundraising 2025',
          description: 'Updated description...',
          image: 'https://storage.googleapis.com/.../campaigns/...',
          goalAmount: 60000,
          currentAmount: 0,
          deadline: '2025-12-31T23:59:59.000Z',
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Campaign not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or permission denied',
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
  )
  updateCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @UploadedFile() image?: Express.Multer.File,
    @Request() req?: any,
  ) {
    const staffId = req.user.sub || req.user.userId;
    return this.staffService.updateCampaign(
      id,
      updateCampaignDto,
      image,
      staffId,
    );
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
  @ApiOperation({
    summary: 'Lấy lịch chấm bài của examiner',
    description: `
Lấy danh sách lịch chấm bài của examiner với thông tin canEvaluate.

**Field canEvaluate (boolean):**
- Kiểm tra xem examiner có thể chấm bài không
- Phụ thuộc vào **isScheduleEnforced** của contest:
  - Nếu **isScheduleEnforced = false**: canEvaluate = true (miễn là schedule ACTIVE) → Dùng cho demo
  - Nếu **isScheduleEnforced = true**: canEvaluate = true chỉ khi hôm nay là ngày được phân công → Vận hành thực tế
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch thành công',
    schema: {
      example: {
        success: true,
        data: [
          {
            scheduleId: 1,
            contestId: 1,
            examinerId: 'uuid-123',
            task: 'Chấm vòng 1',
            round2Table: 'A',
            date: '2025-11-08',
            status: 'ACTIVE',
            createdAt: '2025-11-01T00:00:00Z',
            updatedAt: '2025-11-01T00:00:00Z',
            canEvaluate: true,
            isScheduleEnforced: false,
          },
        ],
        meta: {
          total: 1,
        },
      },
    },
  })
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

  @Post('paintings/:paintingId/upload-round2-image')
  @ApiOperation({
    summary: 'Upload ảnh gốc cho painting vòng 2 và cập nhật thông tin',
    description:
      'Staff upload ảnh gốc (original image) cho paintings trong ROUND_2 và có thể cập nhật title, description. Tất cả các field đều optional, chỉ cập nhật field nào được gửi lên.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh gốc của painting (optional - JPG, PNG, etc.)',
        },
        title: {
          type: 'string',
          description: 'Tiêu đề mới cho painting (optional)',
          example: 'Bức tranh phong cảnh mùa thu',
        },
        description: {
          type: 'string',
          description: 'Mô tả mới cho painting (optional)',
          example: 'Bức tranh miêu tả khung cảnh mùa thu tuyệt đẹp...',
        },
      },
    },
  })
  @ApiParam({
    name: 'paintingId',
    description: 'ID của painting cần upload ảnh',
    example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload ảnh và cập nhật thông tin thành công',
    schema: {
      example: {
        success: true,
        message: 'Round 2 painting updated successfully',
        data: {
          paintingId: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
          imageUrl:
            'https://storage.googleapis.com/bucket-name/paintings/round2/1234567890-image.jpg',
          title: 'Bức tranh phong cảnh mùa thu',
          description: 'Bức tranh miêu tả khung cảnh mùa thu tuyệt đẹp...',
          round: 'ROUND_2',
          table: 'A',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Painting không thuộc ROUND_2 hoặc upload thất bại hoặc không có field nào để cập nhật',
  })
  @ApiResponse({
    status: 404,
    description: 'Painting không tồn tại',
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
  )
  uploadRound2PaintingImage(
    @Param('paintingId') paintingId: string,
    @UploadedFile() image?: Express.Multer.File,
    @Body('title') title?: string,
    @Body('description') description?: string,
  ) {
    return this.staffService.uploadRound2PaintingImage(
      paintingId,
      image,
      title,
      description,
    );
  }

  @Get('contests/:contestId/round2-qualified')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Lấy danh sách paintings đủ điều kiện vào vòng 2',
  })
  @ApiParam({
    name: 'contestId',
    description: 'Contest ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách paintings qualified thành công',
    schema: {
      example: {
        success: true,
        data: {
          contestId: 1,
          contestTitle: 'Art Competition 2025',
          round2Quantity: 20,
          qualified: [
            {
              paintingId: 'uuid-123',
              title: 'Beautiful Landscape',
              imageUrl: 'https://...',
              competitorId: 'uuid-456',
              competitorName: 'Nguyen Van A',
              avgScore: 8.75,
              status: 'ORIGINAL_SUBMITTED',
              hasSubmittedOriginal: true,
              submissionDate: '2025-11-01T00:00:00Z',
            },
          ],
          summary: {
            totalQualified: 20,
            submitted: 18,
            notSubmitted: 2,
            availableReserve: 15,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found hoặc ROUND_1 không tồn tại',
  })
  @ApiResponse({
    status: 400,
    description: 'Contest không có round_2_quantity configured',
  })
  getRound2QualifiedPaintings(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Request() req: any,
  ) {
    return this.staffService.getRound2QualifiedPaintings(contestId);
  }

  @Patch('contests/:contestId/paintings/:paintingId/original-submission')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Cập nhật trạng thái nộp bản gốc',
  })
  @ApiParam({
    name: 'contestId',
    description: 'Contest ID',
    example: 1,
  })
  @ApiParam({
    name: 'paintingId',
    description: 'Painting ID (UUID)',
    example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      example: {
        success: true,
        message:
          'Painting marked as not submitted. Replacement process completed.',
        data: {
          paintingId: 'uuid-123',
          hasSubmittedOriginal: false,
          replacements: [
            {
              removed: {
                paintingId: 'uuid-123',
                title: 'Old Painting',
                competitorId: 'uuid-456',
                avgScore: 7.5,
              },
              added: {
                paintingId: 'uuid-789',
                title: 'New Painting',
                competitorId: 'uuid-101',
                competitorName: 'Nguyen Van B',
                avgScore: 7.3,
              },
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contest hoặc Painting không tồn tại',
  })
  updateOriginalSubmissionStatus(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('paintingId') paintingId: string,
    @Body() updateDto: UpdateOriginalSubmissionStatusDto,
    @Request() req: any,
  ) {
    return this.staffService.updateOriginalSubmissionStatus(
      contestId,
      paintingId,
      updateDto.hasSubmittedOriginal,
    );
  }
}
