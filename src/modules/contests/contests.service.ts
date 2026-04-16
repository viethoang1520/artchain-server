import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contest, ContestStatus } from './entities/contests.entity';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { GetContestDto } from './dto/get-contest.dto';
import { GetAllContestsDto } from './dto/get-all-contests.dto';
import { AssignExaminerDto } from './dto/assign-examiner.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { Round } from './entities/round.entity';
import { CreateRoundDto } from './dto/create-round.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { PaintingsService } from '../paintings/paintings.service';
import { ExaminersService } from '../examiners/examiners.service';
import { CompetitorsService } from '../competitors/competitor.service';
import { SchedulesService } from '../schedules/schedules.service';
import { AwardsService } from '../awards/awards.service';
import { ContestsRoundsService } from './contests-rounds.service';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    private firebaseService: FirebaseService,
    private paintingsService: PaintingsService,
    private examinersService: ExaminersService,
    private competitorsService: CompetitorsService,
    private schedulesService: SchedulesService,
    private awardsService: AwardsService,
    private contestsRoundsService: ContestsRoundsService,
  ) {}

  async findAll(query: GetContestDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.contestsRepository.createQueryBuilder('contest');

    if (query.status) {
      queryBuilder.where('contest.status = :status', { status: query.status });
    }

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit);

    queryBuilder.orderBy('contest.contestId', 'DESC');

    const contests = await queryBuilder.getMany();

    // Lấy thông tin rounds cho từng contest
    const contestsWithRounds = await Promise.all(
      contests.map(async (contest) => {
        const rounds = await this.contestsRoundsService.listByContestIdOrdered(
          contest.contestId,
        );

        return {
          ...contest,
          rounds,
        };
      }),
    );

    return {
      success: true,
      data: contestsWithRounds,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    const rounds = await this.contestsRoundsService.listByContestId(id);

    const contestExaminers =
      await this.examinersService.getAssignmentsByContestId(id);

    const examinersWithNames =
      await this.examinersService.enrichWithExaminerProfile(contestExaminers);

    const awards = await this.awardsService.listByContestId(id);

    const winnerPaintings =
      await this.paintingsService.listWinnerPaintingsByContest(id);

    const winners = await Promise.all(
      winnerPaintings
        .filter((p) => p.awardId !== null)
        .map(async (painting) => {
          const { user } = await this.competitorsService.getCompetitorWithUser(
            painting.competitorId,
          );

          return {
            paintingId: painting.paintingId,
            title: painting.title,
            imageUrl: painting.imageUrl,
            competitorId: painting.competitorId,
            competitorName: user?.fullName || 'Unknown',
            competitorEmail: user?.email || null,
            awardId: painting.awardId,
            awardName: painting.award?.name || null,
            awardRank: painting.award?.rank || null,
            awardPrize: painting.award?.prize || null,
          };
        }),
    );

    return {
      success: true,
      data: {
        ...contest,
        rounds: rounds,
        examiners: examinersWithNames,
        awards,
        winners,
      },
    };
  }

  async findAllForExaminer(examinerId: string) {
    const examiner = await this.examinersService.findExaminerById(examinerId);
    if (!examiner) {
      throw new NotFoundException(`Examiner with ID ${examinerId} not found`);
    }
    const contestExaminers =
      await this.examinersService.getAssignmentsByExaminerId(examinerId);

    if (!contestExaminers.length) {
      return {
        success: true,
        data: [],
        meta: {
          total: 0,
        },
      };
    }

    const contests = contestExaminers.map((ce) => ce.contest);

    // Lấy ngày hiện tại để kiểm tra canEvaluate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const contest of contests) {
      const round = await this.contestsRoundsService.findByContestAndName(
        contest.contestId,
        'ROUND1',
      );
      (contest as any).roundId = round ? round.roundId : null;

      const examinerRelation = contestExaminers.find(
        (ce) => ce.contestId === contest.contestId,
      );
      if (examinerRelation) {
        (contest as any).assignmentStatus = examinerRelation.status;
        (contest as any).assignmentDate = examinerRelation.assignmentDate;
        (contest as any).examinerRole = examinerRelation.role;
      }

      // Kiểm tra canEvaluate dựa trên schedule và isScheduleEnforced
      const schedule =
        await this.schedulesService.findActiveScheduleByExaminerAndContest(
          examinerId,
          contest.contestId,
        );

      let canEvaluate = false;

      if (schedule) {
        if (!contest.isScheduleEnforced) {
          // Nếu không bật ràng buộc lịch → Examiner có thể chấm bất cứ lúc nào
          canEvaluate = true;
        } else {
          // Nếu bật ràng buộc lịch → Phải đúng ngày mới được chấm
          const scheduleDate = new Date(schedule.date);
          scheduleDate.setHours(0, 0, 0, 0);
          canEvaluate = scheduleDate.getTime() === today.getTime();
        }
      }

      (contest as any).canEvaluate = canEvaluate;
      (contest as any).isScheduleEnforced = contest.isScheduleEnforced || false;
    }

    return {
      success: true,
      data: contests,
      meta: {
        total: contests.length,
      },
    };
  }

  async assignExaminerToContest(
    contestId: number,
    assignExaminerDto: AssignExaminerDto,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const examiner = await this.examinersService.findExaminerById(
      assignExaminerDto.examiner_id,
    );

    if (!examiner) {
      throw new NotFoundException(
        `Examiner with ID ${assignExaminerDto.examiner_id} not found`,
      );
    }

    const existingAssignment = await this.examinersService.findAssignment(
      contestId,
      assignExaminerDto.examiner_id,
    );

    if (existingAssignment) {
      throw new BadRequestException(
        `Examiner ${assignExaminerDto.examiner_id} is already assigned to contest ${contestId}`,
      );
    }

    const savedAssignment = await this.examinersService.createAssignment(
      contestId,
      assignExaminerDto.examiner_id,
      assignExaminerDto.role || 'EXAMINER',
    );

    const result = await this.examinersService.findAssignmentWithRelations(
      savedAssignment.contestId,
      savedAssignment.examinerId,
    );

    return {
      success: true,
      message: 'Examiner assigned to contest successfully',
      data: result,
    };
  }

  async getExaminersByContest(contestId: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const examiners =
      await this.examinersService.getAssignmentsByContestId(contestId);

    const examinersWithNames =
      await this.examinersService.enrichWithExaminerProfile(examiners);

    return {
      success: true,
      data: examinersWithNames,
    };
  }

  async removeExaminerFromContest(contestId: number, examinerId: string) {
    const assignment = await this.examinersService.findAssignment(
      contestId,
      examinerId,
    );

    if (!assignment) {
      throw new NotFoundException(
        `Không tìm thấy giám khảo  ${examinerId} trong cuộc thi ${contestId} `,
      );
    }

    const deleteResult =
      await this.examinersService.removeAssignment(assignment);

    if (!deleteResult.affected) {
      throw new NotFoundException(
        `Không tìm thấy bản ghi phân công của giám khảo ${examinerId} trong cuộc thi ${contestId}`,
      );
    }

    return {
      success: true,
      message: 'Giám khảo được xóa thành công',
    };
  }

  async publishContest(id: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    if (contest.status !== ContestStatus.DRAFT) {
      return {
        success: false,
        message: `Contest can only be published from DRAFT status. Current status: ${contest.status}`,
      };
    }

    if (contest.numberOfTablesRound2) {
      if (
        contest.numberOfTablesRound2 < 2 ||
        contest.numberOfTablesRound2 > 26
      ) {
        throw new BadRequestException(
          `Invalid numberOfTablesRound2: ${contest.numberOfTablesRound2}. Must be between 2 and 26 before publishing.`,
        );
      }
    }

    contest.status = ContestStatus.UPCOMING;
    const publishedContest = await this.contestsRepository.save(contest);

    return {
      success: true,
      message: `Contest published successfully with status: ${contest.status}. Contest configuration is now locked and cannot be updated.`,
      data: publishedContest,
    };
  }

  async toggleScheduleEnforcement(contestId: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    contest.isScheduleEnforced = !contest.isScheduleEnforced;

    const updatedContest = await this.contestsRepository.save(contest);

    const message = contest.isScheduleEnforced
      ? 'Schedule enforcement has been enabled. Examiners can only evaluate on their scheduled dates.'
      : 'Schedule enforcement has been disabled. Examiners can evaluate at any time (useful for demo).';

    return {
      success: true,
      message,
      data: {
        contestId: updatedContest.contestId,
        isScheduleEnforced: updatedContest.isScheduleEnforced,
      },
    };
  }

  async getAllContests(queryDto: GetAllContestsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
    } = queryDto;

    const queryBuilder = this.contestsRepository.createQueryBuilder('contest');
    if (search) {
      queryBuilder.andWhere('contest.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('contest.status = :status', { status });
    }

    if (startDateFrom) {
      queryBuilder.andWhere('contest.start_date >= :startDateFrom', {
        startDateFrom,
      });
    }
    if (startDateTo) {
      queryBuilder.andWhere('contest.start_date <= :startDateTo', {
        startDateTo,
      });
    }
    if (endDateFrom) {
      queryBuilder.andWhere('contest.end_date >= :endDateFrom', {
        endDateFrom,
      });
    }
    if (endDateTo) {
      queryBuilder.andWhere('contest.end_date <= :endDateTo', { endDateTo });
    }

    const total = await queryBuilder.getCount();

    const skip = (page - 1) * limit;
    queryBuilder.orderBy('contest.contestId', 'DESC').skip(skip).take(limit);

    const contests = await queryBuilder.getMany();

    const contestsWithRounds = await Promise.all(
      contests.map(async (contest) => {
        const rounds = await this.contestsRoundsService.listByContestIdOrdered(
          contest.contestId,
        );
        return {
          ...contest,
          rounds,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: contestsWithRounds,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async createRound(contestId: number, createRoundDto: CreateRoundDto) {
    return this.contestsRoundsService.createRound(contestId, createRoundDto);
  }

  async getRoundsByContest(contestId: number, _queryDto?: PaginationDto) {
    return this.contestsRoundsService.getRoundsByContest(contestId, _queryDto);
  }

  async getRoundByName(contestId: number, name: string) {
    return this.contestsRoundsService.getRoundByName(contestId, name);
  }

  async getRoundById(contestId: number, roundId: number) {
    return this.contestsRoundsService.getRoundById(contestId, roundId);
  }

  async updateRound(
    contestId: number,
    roundId: number,
    updateRoundDto: UpdateRoundDto,
  ) {
    return this.contestsRoundsService.updateRound(
      contestId,
      roundId,
      updateRoundDto,
    );
  }

  async deleteRound(contestId: number, roundId: number) {
    return this.contestsRoundsService.deleteRound(contestId, roundId);
  }

  async createRound2WithTables(
    contestId: number,
    date: string,
    numberOfTables?: number,
  ) {
    return this.paintingsService.createRound2WithTablesByStaff(
      contestId,
      date,
      numberOfTables,
    );
  }

  async getRound2QualifiedPaintings(contestId: number) {
    return this.paintingsService.getRound2QualifiedPaintingsByStaff(contestId);
  }

  async updateOriginalSubmissionStatus(
    contestId: number,
    paintingId: string,
    hasSubmittedOriginal: boolean,
  ) {
    return this.paintingsService.updateOriginalSubmissionStatusByStaff(
      contestId,
      paintingId,
      hasSubmittedOriginal,
    );
  }

  async createContestByStaff(
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

      const savedRounds: Round[] = [];
      if (createContestDto.rounds && createContestDto.rounds.length > 0) {
        savedRounds.push(
          ...(await this.contestsRoundsService.createRoundsForContest(
            savedContest.contestId,
            createContestDto.rounds,
          )),
        );
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

  async updateContestByStaff(
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

      if (updateContestDto.rounds && updateContestDto.rounds.length > 0) {
        const roundData = updateContestDto.rounds[0];
        await this.contestsRoundsService.upsertRound1ForContest(id, roundData);
      }

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

      const rounds =
        await this.contestsRoundsService.listByContestIdOrdered(id);

      return {
        success: true,
        message: 'Contest updated successfully',
        data: {
          ...savedContest,
          rounds,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Failed to update contest: ${message}`);
    }
  }

  async getContestByStaff(id: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
      relations: ['awards'],
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    const contestWithAwards = await Promise.all(
      contest.awards.map(async (award) => {
        const paintings = await this.paintingsService.listByAwardAndContest(
          award.awardId,
          id,
        );

        const winners = await Promise.all(
          paintings.map(async (painting) => {
            const { competitor, user } =
              await this.competitorsService.getCompetitorWithUser(
                painting.competitorId,
              );

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

    const rounds = await this.contestsRoundsService.listByContestId(id);

    const contestExaminers =
      await this.examinersService.getAssignmentsByContestId(id);

    const examinersWithNames =
      await this.examinersService.enrichWithExaminerProfile(contestExaminers);

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

  async assignAwardToPainting(paintingId: string, awardId: number) {
    return this.paintingsService.assignAwardToPaintingByStaff(
      paintingId,
      awardId,
    );
  }

  async unassignAwardFromPainting(paintingId: string) {
    return this.paintingsService.unassignAwardFromPaintingByStaff(paintingId);
  }

  async uploadRound2PaintingImage(
    paintingId: string,
    imageFile?: Express.Multer.File,
    title?: string,
    description?: string,
  ) {
    return this.paintingsService.uploadRound2PaintingImageByStaff(
      paintingId,
      imageFile,
      title,
      description,
    );
  }

  async create(createContestDto: CreateContestDto) {
    try {
      const contest = this.contestsRepository.create({
        title: createContestDto.title,
        description: createContestDto.description,
        bannerUrl: createContestDto.bannerUrl,
        numOfAward: createContestDto.numOfAward,
        startDate: createContestDto.startDate,
        endDate: createContestDto.endDate,
        status: createContestDto.status || ContestStatus.DRAFT,
        createdBy: createContestDto.createdBy,
      });

      const savedContest = await this.contestsRepository.save(contest);

      const savedRounds: Round[] = [];
      if (createContestDto.rounds && createContestDto.rounds.length > 0) {
        savedRounds.push(
          ...(await this.contestsRoundsService.createRoundsForContest(
            savedContest.contestId,
            createContestDto.rounds,
          )),
        );
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

  async update(id: number, updateContestDto: UpdateContestDto) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }
    const { rounds, ...contestData } = updateContestDto as any;
    const updatedContest = this.contestsRepository.merge(contest, contestData);
    const savedContest = await this.contestsRepository.save(updatedContest);

    let savedRounds: Round[] = [];
    if (rounds && Array.isArray(rounds)) {
      savedRounds = await this.contestsRoundsService.replaceRoundsForContest(
        id,
        rounds,
      );
    }

    return {
      success: true,
      message: 'Contest updated successfully',
      data: {
        contest: savedContest,
        rounds: savedRounds.length > 0 ? savedRounds : undefined,
      },
    };
  }

  async publish(id: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    if (contest.status !== ContestStatus.DRAFT) {
      return {
        success: false,
        message: `Contest can only be published from DRAFT status. Current status: ${contest.status}`,
      };
    }

    const now = new Date();
    const startDate = new Date(contest.startDate);
    const endDate = new Date(contest.endDate);

    let newStatus: ContestStatus;
    if (now < startDate) {
      newStatus = ContestStatus.UPCOMING;
    } else if (now >= startDate && now <= endDate) {
      newStatus = ContestStatus.ACTIVE;
    } else {
      newStatus = ContestStatus.ENDED;
    }

    contest.status = newStatus;
    const publishedContest = await this.contestsRepository.save(contest);

    return {
      success: true,
      message: `Contest published successfully with status: ${newStatus}`,
      data: publishedContest,
    };
  }

  async checkUsersUploadStatus(contestId: number, userIds: string | string[]) {
    const round1 = await this.contestsRoundsService.findByContestAndName(
      contestId,
      'ROUND_1',
    );

    if (!round1) {
      throw new NotFoundException(`ROUND_1 not found for contest ${contestId}`);
    }

    const userIdArray = Array.isArray(userIds) ? userIds : [userIds];

    const uploadStatusResults = await Promise.all(
      userIdArray.map(async (userId) => {
        const isUploaded = await this.paintingsService.hasSubmissionInRound(
          userId,
          contestId,
          round1.roundId,
        );

        return {
          userId: userId,
          isUploaded,
        };
      }),
    );

    return {
      success: true,
      data: uploadStatusResults,
    };
  }
}
