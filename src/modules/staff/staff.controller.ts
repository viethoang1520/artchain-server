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
import { StaffService } from './staff.service';
import { CreateContestDto } from '../contests/dto/create-contest.dto';
import { UpdateContestDto } from '../contests/dto/update-contest.dto';
import { CreateRoundDto } from '../contests/dto/create-round.dto';
import { UpdateRoundDto } from '../contests/dto/update-round.dto';
import { ReviewSubmissionDto } from '../paintings/dto/review-submission.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/staff/contests')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

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
  getAllContests(@Request() req: any) {
    return this.staffService.getAllContests();
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
    @Request() req: any,
  ) {
    return this.staffService.getRoundsByContest(contestId);
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

  @Get('submissions')
  @UseGuards(AuthGuard)
  getAllSubmissions(
    @Query('contestId', ParseIntPipe) contestId?: number,
    @Query('roundId', ParseIntPipe) roundId?: number,
    @Query('status') status?: string,
    @Request() req?: any,
  ) {
    return this.staffService.getAllSubmissions(contestId, roundId, status);
  }

  @Get('submissions/pending')
  @UseGuards(AuthGuard)
  getPendingSubmissions(
    @Query('contestId', ParseIntPipe) contestId?: number,
    @Query('roundId', ParseIntPipe) roundId?: number,
    @Request() req?: any,
  ) {
    return this.staffService.getPendingSubmissions(contestId, roundId);
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
}
