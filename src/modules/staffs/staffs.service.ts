import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Contest, ContestStatus } from '../contests/entities/contests.entity';
import { Round } from '../contests/entities/round.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { CreateContestDto } from '../contests/dto/create-contest.dto';
import { UpdateContestDto } from '../contests/dto/update-contest.dto';
import { CreateRoundDto } from '../contests/dto/create-round.dto';
import { UpdateRoundDto } from '../contests/dto/update-round.dto';
import { ReviewSubmissionDto } from '../paintings/dto/review-submission.dto';
import { GetRoundsByContestDto } from '../contests/dto/get-rounds-by-contest.dto';
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
import { Competitor } from '../competitors/entities/competitors.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { Award } from '../awards/entities/award.entity';
import { Evaluation } from '../paintings/entities/evaluation.entity';
import { WalletsService } from '../wallets/wallet.service';
import { QueryWithdrawRequestDto } from '../wallets/dto/query-withdraw-request.dto';
import { ApproveWithdrawRequestDto } from '../wallets/dto/approve-withdraw-request.dto';
import { RejectWithdrawRequestDto } from '../wallets/dto/reject-withdraw-request.dto';
import { create } from 'domain';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Round)
    private roundsRepository: Repository<Round>,
    @InjectRepository(Painting)
    private paintingsRepository: Repository<Painting>,
    @InjectRepository(ContestExaminer)
    private contestExaminersRepository: Repository<ContestExaminer>,
    @InjectRepository(Examiner)
    private examinersRepository: Repository<Examiner>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Competitor)
    private competitorsRepository: Repository<Competitor>,
    @InjectRepository(Award)
    private awardsRepository: Repository<Award>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
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
    try {
      let bannerUrl: string | undefined = createContestDto.bannerUrl;
      let ruleUrl: string | undefined = createContestDto.ruleUrl;

      if (bannerFile) {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `contests/banners/${Date.now()}-${bannerFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(bannerFile.buffer, {
          metadata: { contentType: bannerFile.mimetype },
        });

        const [url] = await fileUpload.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });

        bannerUrl = url;
      }

      if (ruleFile) {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `contests/rules/${Date.now()}-${ruleFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(ruleFile.buffer, {
          metadata: { contentType: ruleFile.mimetype },
        });

        const [url] = await fileUpload.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });

        ruleUrl = url;
      }

      const contest = this.contestsRepository.create({
        title: createContestDto.title,
        description: createContestDto.description,
        bannerUrl,
        ruleUrl,
        numOfAward: createContestDto.numOfAward,
        round2Quantity: createContestDto.round2Quantity,
        numberOfTablesRound2: createContestDto.numberOfTablesRound2,
        startDate: createContestDto.startDate,
        endDate: createContestDto.endDate,
        status: createContestDto.status || ContestStatus.DRAFT,
        createdBy: createContestDto.createdBy,
      });

      const savedContest = await this.contestsRepository.save(contest);

      // Create rounds if provided
      const savedRounds: Round[] = [];
      if (createContestDto.rounds && createContestDto.rounds.length > 0) {
        for (const roundDto of createContestDto.rounds) {
          const round = this.roundsRepository.create({
            contestId: savedContest.contestId,
            name: roundDto.name,
            table: roundDto.table,
            startDate: roundDto.startDate,
            endDate: roundDto.endDate,
            submissionDeadline: roundDto.submissionDeadline,
            resultAnnounceDate: roundDto.resultAnnounceDate,
            sendOriginalDeadline: roundDto.sendOriginalDeadline,
            status: roundDto.status || 'DRAFT',
          });
          const savedRound = await this.roundsRepository.save(round);
          savedRounds.push(savedRound);
        }
      }

      return {
        success: true,
        message: 'Contest created successfully',
        data: {
          contest: savedContest,
          rounds: savedRounds,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async updateContest(
    id: number,
    updateContestDto: UpdateContestDto,
    bannerFile?: Express.Multer.File,
    ruleFile?: Express.Multer.File,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    if (contest.status !== 'DRAFT') {
      const allowedFields = ['round2Quantity', 'numberOfTablesRound2'];
      const updateFields = Object.keys(updateContestDto).filter(
        (key) => key !== 'rounds' && updateContestDto[key] !== undefined,
      );
      const hasDisallowedUpdates = updateFields.some(
        (field) => !allowedFields.includes(field),
      );

      if (hasDisallowedUpdates || bannerFile || ruleFile) {
        throw new BadRequestException(
          `Cannot update contest. Contest has been published (status: ${contest.status}). Only round2Quantity and numberOfTablesRound2 can be updated for published contests.`,
        );
      }
    }

    try {
      let bannerUrl: string | undefined = updateContestDto.bannerUrl;
      let ruleUrl: string | undefined = updateContestDto.ruleUrl;

      // Upload new banner file to Firebase if provided
      if (bannerFile) {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `contests/banners/${Date.now()}-${bannerFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(bannerFile.buffer, {
          metadata: { contentType: bannerFile.mimetype },
        });

        await fileUpload.makePublic();
        bannerUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      }

      // Upload new rule file to Firebase if provided
      if (ruleFile) {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `contests/rules/${Date.now()}-${ruleFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(ruleFile.buffer, {
          metadata: { contentType: ruleFile.mimetype },
        });

        await fileUpload.makePublic();
        ruleUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      }

      // Update Round 1 if round data is provided
      if (updateContestDto.rounds && updateContestDto.rounds.length > 0) {
        const roundData = updateContestDto.rounds[0];

        // Find existing Round 1
        const existingRound = await this.roundsRepository.findOne({
          where: { contestId: id, name: 'ROUND_1' },
        });

        if (existingRound) {
          // Update existing Round 1
          const updatedRound = this.roundsRepository.merge(
            existingRound,
            roundData,
          );
          await this.roundsRepository.save(updatedRound);
        } else {
          // Create new Round 1 if it doesn't exist
          const newRound = this.roundsRepository.create({
            ...roundData,
            contestId: id,
            name: roundData.name || 'ROUND_1',
          });
          await this.roundsRepository.save(newRound);
        }
      }

      // Merge updated data with contest (excluding rounds)
      const { rounds: roundsData, ...contestData } = updateContestDto;
      const updatedData = {
        ...contestData,
        ...(bannerUrl && { bannerUrl }),
        ...(ruleUrl && { ruleUrl }),
      };

      const updatedContest = this.contestsRepository.merge(
        contest,
        updatedData,
      );
      const savedContest = await this.contestsRepository.save(updatedContest);

      // Fetch rounds separately
      const rounds = await this.roundsRepository.find({
        where: { contestId: id },
        order: { roundId: 'ASC' },
      });

      return {
        success: true,
        message: 'Contest updated successfully',
        data: {
          ...savedContest,
          rounds,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to update contest: ${error.message}`,
      );
    }
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
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
      relations: ['awards'],
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    const contestWithAwards = await Promise.all(
      contest.awards.map(async (award) => {
        const paintings = await this.paintingsRepository.find({
          where: { awardId: award.awardId, contestId: id },
        });

        const winners = await Promise.all(
          paintings.map(async (painting) => {
            const competitor = await this.competitorsRepository.findOne({
              where: { competitorId: painting.competitorId },
            });

            const user = await this.usersRepository.findOne({
              where: { userId: painting.competitorId },
            });

            return {
              paintingId: painting.paintingId,
              title: painting.title,
              imageUrl: painting.imageUrl,
              competitorId: painting.competitorId,
              competitorName: user?.fullName || 'Unknown',
              competitorEmail: user?.email || null,
              competitorSchool: competitor?.schoolName || 'Unknown',
              competitorGrade: competitor?.grade || 'Unknown',
            };
          }),
        );

        return {
          ...award,
          winners,
          winnerCount: winners.length,
        };
      }),
    );

    const rounds = await this.roundsRepository.find({
      where: { contestId: id },
    });

    const contestExaminers = await this.contestExaminersRepository.find({
      where: { contestId: id },
      relations: ['examiner'],
    });

    const examinersWithNames = await Promise.all(
      contestExaminers.map(async (ce) => {
        const user = await this.usersRepository.findOne({
          where: { userId: ce.examinerId },
        });

        return {
          ...ce,
          examinerName: user?.fullName || 'Unknown',
          examinerEmail: user?.email || null,
        };
      }),
    );

    return {
      success: true,
      data: {
        ...contest,
        awards: contestWithAwards,
        rounds,
        examiners: examinersWithNames,
      },
    };
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
        results.failed.push({
          paintingId,
          error: error.message || 'Unknown error occurred',
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
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    if (!date) {
      throw new BadRequestException('Date is required for ROUND_2');
    }

    // Use numberOfTables from parameter, or from contest config, or default to 4
    const tablesToCreate = numberOfTables || contest.numberOfTablesRound2 || 4;

    // Validate numberOfTables
    if (tablesToCreate < 3 || tablesToCreate > 6) {
      throw new BadRequestException(
        'Number of tables must be between 3 and 6 (A-Z)',
      );
    }

    const round2Date = new Date(date);
    if (isNaN(round2Date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const existingRound2 = await this.roundsRepository.findOne({
      where: {
        contestId,
        name: 'ROUND_2',
      },
    });

    if (existingRound2) {
      throw new BadRequestException(
        `ROUND_2 has already been created for contest ${contestId}. Cannot create duplicate ROUND_2.`,
      );
    }

    // Lấy danh sách qualified competitors từ API logic
    const qualifiedData = await this.getRound2QualifiedPaintings(contestId);

    const qualifiedCompetitors = qualifiedData.data.qualified.filter(
      (p) => p.status === 'ORIGINAL_SUBMITTED',
    );

    if (qualifiedCompetitors.length === 0) {
      throw new BadRequestException(
        'No competitors have submitted original paintings yet. Cannot create ROUND_2.',
      );
    }

    if (qualifiedCompetitors.length < tablesToCreate) {
      throw new BadRequestException(
        `Need at least ${tablesToCreate} competitors who submitted originals to create ${tablesToCreate} tables. Only ${qualifiedCompetitors.length} competitors submitted originals.`,
      );
    }

    const topCompetitors = qualifiedCompetitors.map((p) => ({
      competitorId: p.competitorId,
      avgScore: p.avgScore,
      evaluationCount: 1,
    }));

    // Generate table names: A, B, C, D, ... up to tablesToCreate
    const tableNames: string[] = [];
    for (let i = 0; i < tablesToCreate; i++) {
      tableNames.push(String.fromCharCode(65 + i)); // 65 is 'A' in ASCII
    }

    // Distribute competitors using seeding method:
    // Seeds 1-n go to tables in order
    // Seeds (n+1)-2n go to tables in reverse order
    // Seeds (2n+1)-3n go to tables in order
    // And so on...
    const tables: string[][] = Array(tablesToCreate)
      .fill(null)
      .map(() => []);

    for (let i = 0; i < topCompetitors.length; i++) {
      const group = Math.floor(i / tablesToCreate); // Which group
      const positionInGroup = i % tablesToCreate; // Position within the group

      let tableIndex;
      if (group % 2 === 0) {
        tableIndex = positionInGroup;
      } else {
        tableIndex = tablesToCreate - 1 - positionInGroup;
      }

      tables[tableIndex].push(topCompetitors[i].competitorId);
    }

    const createdRounds: Round[] = [];
    const createdPaintings: Painting[] = [];

    for (let i = 0; i < tablesToCreate; i++) {
      const round = this.roundsRepository.create({
        contestId,
        name: 'ROUND_2',
        table: tableNames[i],
        startDate: round2Date,
        endDate: round2Date,
        status: 'DRAFT',
      });

      const savedRound = await this.roundsRepository.save(round);
      createdRounds.push(savedRound);

      for (const competitorId of tables[i]) {
        const user = await this.usersRepository.findOne({
          where: { userId: competitorId },
        });
        const competitorName = user?.fullName || competitorId;

        const painting = this.paintingsRepository.create({
          competitorId,
          contestId,
          roundId: savedRound.roundId,
          title: `Bảng ${tableNames[i]} - ${competitorName}`,
          description: `Tranh cho Vòng 2, Bảng ${tableNames[i]}. Đang chờ giám khảo tải lên.`,
          status: 'ACCEPTED',
        });

        const savedPainting = await this.paintingsRepository.save(painting);
        createdPaintings.push(savedPainting);
      }
    }

    // Build dynamic table distribution object
    const paintingsByTable: { [key: string]: Painting[] } = {};
    const tableDistribution: any = {};

    for (let i = 0; i < tablesToCreate; i++) {
      const tableName = `Table ${tableNames[i]}`;
      paintingsByTable[tableName] = createdPaintings.filter(
        (p) => p.roundId === createdRounds[i].roundId,
      );

      tableDistribution[tableName] = {
        roundId: createdRounds[i].roundId,
        competitors: tables[i],
        count: tables[i].length,
        paintings: paintingsByTable[tableName].map((p) => ({
          paintingId: p.paintingId,
          competitorId: p.competitorId,
          status: p.status,
        })),
      };
    }

    return {
      success: true,
      message: `ROUND_2 created successfully with ${tablesToCreate} tables using seeding based on average scores`,
      data: {
        rounds: createdRounds,
        seedingInfo: topCompetitors.map((comp, index) => ({
          seed: index + 1,
          competitorId: comp.competitorId,
          avgScore: comp.avgScore,
          evaluationCount: comp.evaluationCount,
        })),
        tableDistribution,
        numberOfTables: tablesToCreate,
        totalCompetitors: topCompetitors.length,
        qualifiedWithOriginals: qualifiedCompetitors.length,
        totalPaintingsCreated: createdPaintings.length,
      },
    };
  }

  async assignAwardToPainting(paintingId: string, awardId: number) {
    // Check if painting exists
    const painting = await this.paintingsRepository.findOne({
      where: { paintingId },
      relations: ['award'],
    });

    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    // Check if painting already has an award
    if (painting.awardId) {
      throw new BadRequestException(
        `Painting already has an award assigned (Award ID: ${painting.awardId})`,
      );
    }

    // Check if award exists
    const award = await this.awardsRepository.findOne({
      where: { awardId },
      relations: ['paintings'],
    });

    if (!award) {
      throw new NotFoundException(`Award with ID ${awardId} not found`);
    }

    if (award.quantity) {
      const paintingsWithAward = await this.paintingsRepository.count({
        where: { awardId },
      });

      if (paintingsWithAward >= award.quantity) {
        throw new BadRequestException(
          `Award "${award.name}" has reached its maximum quantity (${award.quantity}). Cannot assign more paintings.`,
        );
      }
    }

    painting.awardId = awardId;
    const updatedPainting = await this.paintingsRepository.save(painting);

    const currentCount = await this.paintingsRepository.count({
      where: { awardId },
    });

    return {
      success: true,
      message: 'Award assigned to painting successfully',
      data: {
        paintingId: updatedPainting.paintingId,
        awardId: updatedPainting.awardId,
        awardName: award.name,
        awardRank: award.rank,
        awardPrize: award.prize,
      },
      meta: {
        currentAssignedCount: currentCount,
        maxQuantity: award.quantity,
        remainingSlots: award.quantity ? award.quantity - currentCount : null,
      },
    };
  }

  async unassignAwardFromPainting(paintingId: string) {
    const painting = await this.paintingsRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    if (!painting.awardId) {
      throw new BadRequestException(
        'Painting does not have any award assigned',
      );
    }

    const previousAwardId = painting.awardId;

    painting.awardId = null;
    await this.paintingsRepository.save(painting);

    return {
      success: true,
      message: 'Award unassigned from painting successfully',
      data: {
        paintingId: painting.paintingId,
        previousAwardId,
      },
    };
  }

  async uploadRound2PaintingImage(
    paintingId: string,
    imageFile?: Express.Multer.File,
    title?: string,
    description?: string,
  ) {
    // Validate painting exists
    const painting = await this.paintingsRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    // Validate painting is in ROUND_2
    const round = await this.roundsRepository.findOne({
      where: { roundId: painting.roundId },
    });

    if (!round || round.name !== 'ROUND_2') {
      throw new BadRequestException(
        'This painting is not in ROUND_2. Can only update ROUND_2 paintings.',
      );
    }

    // Check if at least one field is provided
    if (!imageFile && !title && !description) {
      throw new BadRequestException(
        'At least one field (image, title, or description) must be provided',
      );
    }

    let imageUrl = painting.imageUrl;

    // Upload image to Firebase Storage if provided
    if (imageFile) {
      try {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `paintings/round2/${Date.now()}-${imageFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(imageFile.buffer, {
          metadata: { contentType: imageFile.mimetype },
        });

        await fileUpload.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        painting.imageUrl = imageUrl;
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload image: ${error.message}`,
        );
      }
    }

    // Update optional fields only if provided
    if (title) {
      painting.title = title;
    }
    if (description) {
      painting.description = description;
    }

    await this.paintingsRepository.save(painting);

    return {
      success: true,
      message: 'Round 2 painting updated successfully',
      data: {
        paintingId: painting.paintingId,
        imageUrl: painting.imageUrl,
        title: painting.title,
        description: painting.description,
        round: round.name,
        table: round.table,
      },
    };
  }

  private async calculateCompetitorScores(
    passedPaintings: Painting[],
    contestId: number,
  ) {
    const uniqueCompetitorIds = [
      ...new Set(passedPaintings.map((p) => p.competitorId)),
    ];

    const competitorScores = await Promise.all(
      uniqueCompetitorIds.map(async (competitorId) => {
        const competitorPaintings = passedPaintings.filter(
          (p) => p.competitorId === competitorId && p.contestId === contestId,
        );

        const paintingIds = competitorPaintings.map((p) => p.paintingId);
        const evaluations = await this.evaluationsRepository.find({
          where: paintingIds.map((paintingId) => ({ paintingId })),
        });

        let avgScore = 0;
        if (evaluations.length > 0) {
          const totalScore = evaluations.reduce(
            (sum, evaluation) => sum + (evaluation.scoreRound1 || 0),
            0,
          );
          avgScore = totalScore / evaluations.length;
        }

        return {
          competitorId,
          avgScore,
          evaluationCount: evaluations.length,
        };
      }),
    );

    competitorScores.sort((a, b) => b.avgScore - a.avgScore);

    return competitorScores;
  }

  async getRound2QualifiedPaintings(contestId: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    if (!contest.round2Quantity) {
      throw new BadRequestException(
        'This contest does not have round_2_quantity configured',
      );
    }

    const round1 = await this.roundsRepository.findOne({
      where: { contestId, name: 'ROUND_1' },
    });

    if (!round1) {
      throw new NotFoundException('ROUND_1 not found for this contest');
    }

    const paintings = await this.paintingsRepository.find({
      where: {
        contestId,
        roundId: round1.roundId,
        status: In(['ACCEPTED', 'ORIGINAL_SUBMITTED']),
      },
    });

    const competitorScores = await this.calculateCompetitorScores(
      paintings,
      contestId,
    );

    const competitorsWithDetails = await Promise.all(
      competitorScores.map(async (compScore) => {
        const competitor = await this.usersRepository.findOne({
          where: { userId: compScore.competitorId },
        });

        const competitorPaintings = paintings.filter(
          (p) => p.competitorId === compScore.competitorId,
        );

        const paintingsWithScores = await Promise.all(
          competitorPaintings.map(async (painting) => {
            const evaluations = await this.evaluationsRepository.find({
              where: { paintingId: painting.paintingId },
            });

            if (evaluations.length === 0) return null;

            const totalScore = evaluations.reduce((sum, evaluation) => {
              return sum + (evaluation.scoreRound1 || 0);
            }, 0);

            const avgScore = totalScore / evaluations.length;

            return {
              paintingId: painting.paintingId,
              title: painting.title,
              imageUrl: painting.imageUrl,
              status: painting.status,
              avgScore: Number(avgScore.toFixed(2)),
              submissionDate: painting.submissionDate,
            };
          }),
        );

        const validPaintings = paintingsWithScores.filter((p) => p !== null);
        const bestPainting = validPaintings.sort((a, b) => {
          // Sắp xếp theo điểm trung bình giảm dần
          if (b.avgScore !== a.avgScore) {
            return b.avgScore - a.avgScore;
          }
          // Nếu điểm bằng nhau, sắp xếp theo thời gian nộp tăng dần
          const dateA = a.submissionDate
            ? new Date(a.submissionDate).getTime()
            : Infinity;
          const dateB = b.submissionDate
            ? new Date(b.submissionDate).getTime()
            : Infinity;
          return dateA - dateB;
        })[0];

        const hasSubmittedOriginal = competitorPaintings.some(
          (p) => p.status === 'ORIGINAL_SUBMITTED',
        );

        return {
          competitorId: compScore.competitorId,
          competitorName: competitor?.fullName || 'Unknown',
          competitorEmail: competitor?.email || null,
          avgScore: Number(compScore.avgScore.toFixed(2)),
          evaluationCount: compScore.evaluationCount,
          painting: bestPainting || null,
          status: hasSubmittedOriginal
            ? 'ORIGINAL_SUBMITTED'
            : competitorPaintings[0]?.status || 'ACCEPTED',
          hasSubmittedOriginal,
        };
      }),
    );

    const qualifiedCompetitors = competitorsWithDetails.slice(
      0,
      contest.round2Quantity,
    );

    const notSubmittedCount = qualifiedCompetitors.filter(
      (c) => !c.hasSubmittedOriginal,
    ).length;

    return {
      success: true,
      message: 'Qualified list shows top competitors who passed ROUND_1.',
      data: {
        contestId,
        contestTitle: contest.title,
        round2Quantity: contest.round2Quantity,
        qualified: qualifiedCompetitors,
        summary: {
          totalQualified: qualifiedCompetitors.length,
          submitted: qualifiedCompetitors.filter((c) => c.hasSubmittedOriginal)
            .length,
          notSubmitted: notSubmittedCount,
        },
      },
    };
  }

  async updateOriginalSubmissionStatus(
    contestId: number,
    paintingId: string,
    hasSubmittedOriginal: boolean,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const painting = await this.paintingsRepository.findOne({
      where: { paintingId, contestId },
    });

    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    painting.status = hasSubmittedOriginal
      ? 'ORIGINAL_SUBMITTED'
      : 'NOT_SUBMITTED_ORIGINAL';
    await this.paintingsRepository.save(painting);

    return {
      success: true,
      message: hasSubmittedOriginal
        ? 'Original submission status updated successfully'
        : 'Painting marked as not submitted original',
      data: {
        paintingId,
        status: painting.status,
        hasSubmittedOriginal,
      },
    };
  }
}
