import { Injectable, BadRequestException } from '@nestjs/common';
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
import { CreateScheduleDto } from '../examiners/dto/create-schedule.dto';
import { UpdateScheduleDto } from '../examiners/dto/update-schedule.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { WalletsService } from '../wallets/wallet.service';
import { PaintingsService } from '../paintings/paintings.service';
import { ExaminersService } from '../examiners/examiners.service';
import { QueryWithdrawRequestDto } from '../wallets/dto/query-withdraw-request.dto';
import { ApproveWithdrawRequestDto } from '../wallets/dto/approve-withdraw-request.dto';
import { RejectWithdrawRequestDto } from '../wallets/dto/reject-withdraw-request.dto';

@Injectable()
export class StaffService {
  constructor(
    private firebaseService: FirebaseService,
    private campaignsService: CampaignsService,
    private contestsService: ContestsService,
    private paintingsService: PaintingsService,
    private examinersService: ExaminersService,
    private walletsService: WalletsService,
  ) { }

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

  async toggleIgnoreAiCheck(contestId: number) {
    return this.contestsService.toggleIgnoreAiCheck(contestId);
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
    return this.paintingsService.getAllSubmissionsByStaff(queryDto);
  }

  async getSubmission(paintingId: string) {
    return this.paintingsService.getSubmissionByStaff(paintingId);
  }

  async reviewSubmission(paintingId: string, reviewDto: ReviewSubmissionDto) {
    return this.paintingsService.reviewSubmissionByStaff(paintingId, reviewDto);
  }

  async acceptSubmission(paintingId: string) {
    return this.reviewSubmission(paintingId, { status: 'ACCEPTED' });
  }

  async acceptMultipleSubmissions(paintingIds: string[]) {
    return this.paintingsService.acceptMultipleSubmissionsByStaff(paintingIds);
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
    return this.examinersService.getAllExaminers();
  }

  async createSchedule(createScheduleDto: CreateScheduleDto) {
    return this.examinersService.createSchedule(createScheduleDto);
  }

  async getSchedulesByExaminer(examinerId: string) {
    return this.examinersService.getSchedulesByExaminer(examinerId);
  }

  async getSchedulesByContest(contestId: number) {
    return this.examinersService.getSchedulesByContest(contestId);
  }

  async updateSchedule(
    scheduleId: number,
    updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.examinersService.updateSchedule(scheduleId, updateScheduleDto);
  }

  async deleteSchedule(scheduleId: number) {
    return this.examinersService.deleteSchedule(scheduleId);
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
