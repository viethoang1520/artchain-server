import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Painting } from '../paintings/entities/paintings.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { CreateContestDto } from '../contests/dto/create-contest.dto';
import { UpdateContestDto } from '../contests/dto/update-contest.dto';
import { CreateRoundDto } from '../contests/dto/create-round.dto';
import { UpdateRoundDto } from '../contests/dto/update-round.dto';
import { ReviewSubmissionDto } from '../paintings/dto/review-submission.dto';
import { GetAllSubmissionsDto } from '../paintings/dto/get-all-submissions.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { GetAllContestsDto } from '../contests/dto/get-all-contests.dto';
import { AssignExaminerDto } from '../contests/dto/assign-examiner.dto';
import { CreateCampaignDto } from '../campaigns/dto/create-campaign.dto';
import { UpdateCampaignDto } from '../campaigns/dto/update-campaign.dto';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ContestsService } from '../contests/contests.service';
import { User, UserRole } from '../users/entities/user.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { CreateScheduleDto } from '../schedules/dto/create-schedule.dto';
import { UpdateScheduleDto } from '../schedules/dto/update-schedule.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { WalletsService } from '../wallets/wallet.service';
import { QueryWithdrawRequestDto } from '../wallets/dto/query-withdraw-request.dto';
import { ApproveWithdrawRequestDto } from '../wallets/dto/approve-withdraw-request.dto';
import { RejectWithdrawRequestDto } from '../wallets/dto/reject-withdraw-request.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Painting)
    private paintingsRepository: Repository<Painting>,
    @InjectRepository(Examiner)
    private examinersRepository: Repository<Examiner>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private firebaseService: FirebaseService,
    private campaignsService: CampaignsService,
    private contestsService: ContestsService,
    private schedulesService: SchedulesService,
    private walletsService: WalletsService,
  ) {}

  async getWithdrawRequests(
    staffId: string,
    queryDto: QueryWithdrawRequestDto,
  ) {
    return this.walletsService.getWithdrawRequestsForStaff(staffId, queryDto);
  }

  async approveWithdrawRequest(
    staffId: string,
    requestId: string,
    approveDto: ApproveWithdrawRequestDto,
  ) {
    return this.walletsService.approveWithdrawRequest(
      staffId,
      requestId,
      approveDto,
    );
  }

  async uploadWithdrawProofImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('Thiếu file ảnh chứng từ chuyển khoản');
    }

    const bucket = this.firebaseService.getStorage().bucket();
    const fileName = `wallet-withdraw/proofs/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    const [url] = await fileUpload.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    return url;
  }

  async rejectWithdrawRequest(
    staffId: string,
    requestId: string,
    rejectDto: RejectWithdrawRequestDto,
  ) {
    return this.walletsService.rejectWithdrawRequest(
      staffId,
      requestId,
      rejectDto,
    );
  }

  async createContest(
    createContestDto: CreateContestDto,
    bannerFile?: Express.Multer.File,
    ruleFile?: Express.Multer.File,
  ) {
    return this.contestsService.createContestByStaff(
      createContestDto,
      bannerFile,
      ruleFile,
    );
  }

  async updateContest(
    id: number,
    updateContestDto: UpdateContestDto,
    bannerFile?: Express.Multer.File,
    ruleFile?: Express.Multer.File,
  ) {
    return this.contestsService.updateContestByStaff(
      id,
      updateContestDto,
      bannerFile,
      ruleFile,
    );
  }

  async publishContest(id: number) {
    return this.contestsService.publishContest(id);
  }

  async toggleScheduleEnforcement(contestId: number) {
    return this.contestsService.toggleScheduleEnforcement(contestId);
  }

  async getAllContests(queryDto: GetAllContestsDto) {
    return this.contestsService.getAllContests(queryDto);
  }

  async getContest(id: number) {
    return this.contestsService.getContestByStaff(id);
  }

  async createRound(contestId: number, createRoundDto: CreateRoundDto) {
    return this.contestsService.createRound(contestId, createRoundDto);
  }

  async getRoundsByContest(contestId: number, queryDto: PaginationDto) {
    return this.contestsService.getRoundsByContest(contestId, queryDto);
  }

  async getRoundByName(contestId: number, name: string) {
    return this.contestsService.getRoundByName(contestId, name);
  }

  async getRoundById(contestId: number, roundId: number) {
    return this.contestsService.getRoundById(contestId, roundId);
  }

  async updateRound(
    contestId: number,
    roundId: number,
    updateRoundDto: UpdateRoundDto,
  ) {
    return this.contestsService.updateRound(contestId, roundId, updateRoundDto);
  }

  async deleteRound(contestId: number, roundId: number) {
    return this.contestsService.deleteRound(contestId, roundId);
  }

  async getAllSubmissions(queryDto: GetAllSubmissionsDto) {
    const { page = 1, limit = 10, contestId, roundId, status } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.paintingsRepository.createQueryBuilder('painting');

    if (contestId) {
      queryBuilder.where('painting.contest_id = :contestId', { contestId });
    }

    if (roundId) {
      queryBuilder.andWhere('painting.round_id = :roundId', { roundId });
    }

    if (status) {
      queryBuilder.andWhere('painting.status = :status', { status });
    }

    queryBuilder
      .orderBy('painting.submission_date', 'DESC')
      .skip(skip)
      .take(limit);

    const [paintings, total] = await queryBuilder.getManyAndCount();

    const paintingsWithCompetitor = await Promise.all(
      paintings.map(async (painting) => {
        let competitorInfo: any = null;
        if (painting.competitorId) {
          const competitor = await this.usersRepository.findOne({
            where: { userId: painting.competitorId },
          });

          if (competitor) {
            competitorInfo = {
              competitorId: competitor.userId,
              fullName: competitor.fullName || null,
              email: competitor.email || null,
              phone: competitor.phone || null,
              username: competitor.username || null,
            };
          }
        }

        return {
          ...painting,
          competitor: competitorInfo,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      success: true,
      data: paintingsWithCompetitor,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        contestId,
        roundId,
        status,
      },
    };
  }

  async getSubmission(paintingId: string) {
    const painting = await this.paintingsRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Submission with ID ${paintingId} not found`);
    }

    let competitorInfo;
    if (painting.competitorId) {
      const competitor = await this.usersRepository.findOne({
        where: { userId: painting.competitorId },
      });

      if (competitor) {
        competitorInfo = {
          competitorId: competitor.userId,
          fullName: competitor.fullName,
          email: competitor.email,
          phone: competitor.phone,
          username: competitor.username,
        };
      }
    }

    return {
      success: true,
      data: {
        ...painting,
        competitor: competitorInfo,
      },
    };
  }

  async reviewSubmission(paintingId: string, reviewDto: ReviewSubmissionDto) {
    const painting = await this.paintingsRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Submission with ID ${paintingId} not found`);
    }

    // if (reviewDto.status === 'REJECTED' && !reviewDto.reason) {
    //   throw new BadRequestException(
    //     'Reason is required when rejecting a submission',
    //   );
    // }
    painting.status = reviewDto.status;

    const updatedPainting = await this.paintingsRepository.save(painting);

    return {
      success: true,
      message: `Submission ${reviewDto.status.toLowerCase()} successfully`,
      data: {
        ...updatedPainting,
        // rejectionReason: reviewDto.reason,
      },
    };
  }

  async acceptSubmission(paintingId: string) {
    return this.reviewSubmission(paintingId, { status: 'ACCEPTED' });
  }

  async acceptMultipleSubmissions(paintingIds: string[]) {
    const results: {
      successful: Array<{ paintingId: string; status: string }>;
      failed: Array<{ paintingId: string; error: string }>;
    } = {
      successful: [],
      failed: [],
    };

    // Process each painting
    for (const paintingId of paintingIds) {
      try {
        await this.reviewSubmission(paintingId, { status: 'ACCEPTED' });
        results.successful.push({
          paintingId,
          status: 'ACCEPTED',
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred';
        results.failed.push({
          paintingId,
          error: message,
        });
      }
    }

    const successCount = results.successful.length;
    const failureCount = results.failed.length;
    const total = paintingIds.length;

    return {
      success: true,
      message: `Processed ${total} submissions: ${successCount} accepted, ${failureCount} failed`,
      data: results,
      meta: {
        total,
        successCount,
        failureCount,
      },
    };
  }

  async rejectSubmission(paintingId: string, reason: string) {
    // if (!reason) {
    //   throw new BadRequestException(
    //     'Reason is required when rejecting a submission',
    //   );
    // }
    return this.reviewSubmission(paintingId, { status: 'REJECTED' });
  }

  async getPendingSubmissions(contestId?: number, roundId?: number) {
    const queryDto = new GetAllSubmissionsDto();
    queryDto.contestId = contestId;
    queryDto.roundId = roundId;
    queryDto.status = 'PENDING';
    return this.getAllSubmissions(queryDto);
  }

  async assignExaminerToContest(
    contestId: number,
    assignExaminerDto: AssignExaminerDto,
  ) {
    return this.contestsService.assignExaminerToContest(
      contestId,
      assignExaminerDto,
    );
  }

  async getExaminersByContest(contestId: number) {
    return this.contestsService.getExaminersByContest(contestId);
  }

  async removeExaminerFromContest(contestId: number, examinerId: string) {
    return this.contestsService.removeExaminerFromContest(
      contestId,
      examinerId,
    );
  }

  async createCampaign(data: {
    createCampaignDto: CreateCampaignDto;
    staffId: string;
    imageFile?: Express.Multer.File;
  }) {
    return this.campaignsService.createCampaignByStaff(data);
  }

  async updateCampaign(
    campaignId: number,
    updateCampaignDto: UpdateCampaignDto,
    imageFile?: Express.Multer.File,
    staffId?: string,
  ) {
    return this.campaignsService.updateCampaignByStaff(
      campaignId,
      updateCampaignDto,
      imageFile,
      staffId,
    );
  }

  async getAllExaminers() {
    const examiners = await this.usersRepository.find({
      where: { role: UserRole.EXAMINER },
    });

    const examinersWithDetails = await Promise.all(
      examiners.map(async (user) => {
        const examinerDetails = await this.examinersRepository.findOne({
          where: { examinerId: user.userId },
        });

        return {
          examinerId: user.userId,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          status: user.status,
          specialization: examinerDetails?.specialization || null,
          assignedScheduleId: examinerDetails?.assignedScheduleId || null,
        };
      }),
    );

    return {
      success: true,
      data: examinersWithDetails,
      meta: {
        total: examinersWithDetails.length,
      },
    };
  }

  async createSchedule(createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.createSchedule(createScheduleDto);
  }

  async getSchedulesByExaminer(examinerId: string) {
    return this.schedulesService.getSchedulesByExaminer(examinerId);
  }

  async getSchedulesByContest(contestId: number) {
    return this.schedulesService.getSchedulesByContest(contestId);
  }

  async updateSchedule(
    scheduleId: number,
    updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.updateSchedule(scheduleId, updateScheduleDto);
  }

  async deleteSchedule(scheduleId: number) {
    return this.schedulesService.deleteSchedule(scheduleId);
  }

  async createRound2WithTables(
    contestId: number,
    date: string,
    numberOfTables?: number,
  ) {
    return this.contestsService.createRound2WithTables(
      contestId,
      date,
      numberOfTables,
    );
  }

  async assignAwardToPainting(paintingId: string, awardId: number) {
    return this.contestsService.assignAwardToPainting(paintingId, awardId);
  }

  async unassignAwardFromPainting(paintingId: string) {
    return this.contestsService.unassignAwardFromPainting(paintingId);
  }

  async uploadRound2PaintingImage(
    paintingId: string,
    imageFile?: Express.Multer.File,
    title?: string,
    description?: string,
  ) {
    return this.contestsService.uploadRound2PaintingImage(
      paintingId,
      imageFile,
      title,
      description,
    );
  }

  async getRound2QualifiedPaintings(contestId: number) {
    return this.contestsService.getRound2QualifiedPaintings(contestId);
  }

  async updateOriginalSubmissionStatus(
    contestId: number,
    paintingId: string,
    hasSubmittedOriginal: boolean,
  ) {
    return this.contestsService.updateOriginalSubmissionStatus(
      contestId,
      paintingId,
      hasSubmittedOriginal,
    );
  }
}
