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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateContestDto } from '../contests/dto/create-contest.dto';
import { UpdateContestDto } from '../contests/dto/update-contest.dto';
import { CreateRoundDto } from '../contests/dto/create-round.dto';
import { UpdateRoundDto } from '../contests/dto/update-round.dto';
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

@ApiTags('Staff Management')
@ApiBearerAuth()
@Controller('api/staff/contests')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly postsService: PostsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  createContest(
    @Body() createContestDto: CreateContestDto,
    @Request() req: any,
  ) {
    const createdBy = req.user.sub || req.user.userId;
    return this.staffService.createContest({ ...createContestDto, createdBy });
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  updateContest(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContestDto: UpdateContestDto,
    @Request() req: any,
  ) {
    return this.staffService.updateContest(id, updateContestDto);
  }

  @Patch(':id/publish')
  @UseGuards(AuthGuard)
  publishContest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.staffService.publishContest(id);
  }

  @Get()
  @UseGuards(AuthGuard)
  getAllContests(@Query() queryDto: GetAllContestsDto, @Request() req: any) {
    return this.staffService.getAllContests(queryDto);
  }

  @Get('submissions')
  @UseGuards(AuthGuard)
  getAllSubmissions(
    @Query() queryDto: GetAllSubmissionsDto,
    @Request() req?: any,
  ) {
    return this.staffService.getAllSubmissions(queryDto);
  }

  @Get('submissions/pending')
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

  @Get('submissions/:paintingId')
  @UseGuards(AuthGuard)
  getSubmission(@Param('paintingId') paintingId: string, @Request() req: any) {
    return this.staffService.getSubmission(paintingId);
  }

  @Patch('submissions/:paintingId/review')
  @UseGuards(AuthGuard)
  reviewSubmission(
    @Param('paintingId') paintingId: string,
    @Body() reviewDto: ReviewSubmissionDto,
    @Request() req: any,
  ) {
    return this.staffService.reviewSubmission(paintingId, reviewDto);
  }

  @Patch('submissions/:paintingId/accept')
  @UseGuards(AuthGuard)
  acceptSubmission(
    @Param('paintingId') paintingId: string,
    @Request() req: any,
  ) {
    return this.staffService.acceptSubmission(paintingId);
  }

  @Patch('submissions/:paintingId/reject')
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
  createPost(@Body() createPostDto: CreatePostDto, @Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    return this.postsService.createPost({
      ...createPostDto,
      account_id: createPostDto.account_id || userId,
    });
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

  @Get(':id')
  @UseGuards(AuthGuard)
  getContest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.staffService.getContest(id);
  }

  @Post(':contestId/rounds')
  @UseGuards(AuthGuard)
  createRound(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Body() createRoundDto: CreateRoundDto,
    @Request() req: any,
  ) {
    return this.staffService.createRound(contestId, createRoundDto);
  }

  @Get(':contestId/rounds')
  @UseGuards(AuthGuard)
  getRoundsByContest(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Query() queryDto: PaginationDto,
    @Request() req: any,
  ) {
    return this.staffService.getRoundsByContest(contestId, queryDto);
  }

  @Get(':contestId/rounds/:roundId')
  @UseGuards(AuthGuard)
  getRound(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('roundId', ParseIntPipe) roundId: number,
    @Request() req: any,
  ) {
    return this.staffService.getRound(contestId, roundId);
  }

  @Patch(':contestId/rounds/:roundId')
  @UseGuards(AuthGuard)
  updateRound(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() updateRoundDto: UpdateRoundDto,
    @Request() req: any,
  ) {
    return this.staffService.updateRound(contestId, roundId, updateRoundDto);
  }

  @Delete(':contestId/rounds/:roundId')
  @UseGuards(AuthGuard)
  deleteRound(
    @Param('contestId', ParseIntPipe) contestId: number,
    @Param('roundId', ParseIntPipe) roundId: number,
    @Request() req: any,
  ) {
    return this.staffService.deleteRound(contestId, roundId);
  }
}
