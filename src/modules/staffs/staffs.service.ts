import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { Campaign } from '../campaigns/entities/campaign.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { CreateScheduleDto } from '../schedules/dto/create-schedule.dto';
import { UpdateScheduleDto } from '../schedules/dto/update-schedule.dto';
import { Competitor } from '../competitors/entities/competitors.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { Award } from '../awards/entities/award.entity';
import { Evaluation } from '../paintings/entities/evaluation.entity';

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
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Schedule)
    private schedulesRepository: Repository<Schedule>,
    @InjectRepository(Competitor)
    private competitorsRepository: Repository<Competitor>,
    @InjectRepository(Award)
    private awardsRepository: Repository<Award>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    private firebaseService: FirebaseService,
  ) {}

  async createContest(
    createContestDto: CreateContestDto,
    bannerFile?: Express.Multer.File,
    ruleFile?: Express.Multer.File,
  ) {
    try {
      let bannerUrl: string | undefined = createContestDto.bannerUrl;
      let ruleUrl: string | undefined = createContestDto.ruleUrl;

      // Upload banner file to Firebase if provided
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

    // Check if contest is already published
    if (contest.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot update contest. Contest has been published (status: ${contest.status}). Only DRAFT contests can be updated.`,
      );
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

    // Validate numberOfTablesRound2 before publishing
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

    contest.status = ContestStatus.ACTIVE;
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

    // Toggle the value
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
        const rounds = await this.roundsRepository.find({
          where: { contestId: contest.contestId },
          order: { roundId: 'ASC' },
        });
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

  async getContest(id: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

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
        rounds,
        examiners: examinersWithNames,
      },
    };
  }

  async createRound(contestId: number, createRoundDto: CreateRoundDto) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const round = this.roundsRepository.create({
      contestId,
      name: createRoundDto.name,
      table: createRoundDto.table,
      startDate: createRoundDto.startDate,
      endDate: createRoundDto.endDate,
      submissionDeadline: createRoundDto.submissionDeadline,
      resultAnnounceDate: createRoundDto.resultAnnounceDate,
      sendOriginalDeadline: createRoundDto.sendOriginalDeadline,
      status: createRoundDto.status || 'DRAFT',
    });

    const savedRound = await this.roundsRepository.save(round);

    return {
      success: true,
      message: 'Round created successfully',
      data: savedRound,
    };
  }

  async getRoundsByContest(contestId: number, queryDto: PaginationDto) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    // Get all rounds for this contest without pagination
    const allRounds = await this.roundsRepository.find({
      where: { contestId },
      order: { name: 'ASC', table: 'ASC' },
    });

    // Group rounds by name
    const groupedRounds = allRounds.reduce(
      (acc, round) => {
        const roundName = round.name;
        if (!acc[roundName]) {
          acc[roundName] = [];
        }
        acc[roundName].push(round);
        return acc;
      },
      {} as Record<string, typeof allRounds>,
    );

    // Format response for each round type
    const formattedRounds = await Promise.all(
      Object.entries(groupedRounds).map(async ([roundName, rounds]) => {
        if (roundName === 'ROUND_2') {
          // For ROUND_2, show all tables (A, B, C, D) with basic info
          const tablesData = rounds
            .filter((r) => r.table && ['A', 'B', 'C', 'D'].includes(r.table))
            .map((tableRound) => ({
              roundId: tableRound.roundId,
              table: tableRound.table,
              startDate: tableRound.startDate,
              endDate: tableRound.endDate,
              submissionDeadline: tableRound.submissionDeadline,
              resultAnnounceDate: tableRound.resultAnnounceDate,
              sendOriginalDeadline: tableRound.sendOriginalDeadline,
              status: tableRound.status,
            }));

          return {
            name: roundName,
            isRound2: true,
            tables: tablesData,
            totalTables: tablesData.length,
          };
        } else {
          // For other rounds (ROUND_1, etc.), only show rounds with table='paintings'
          const paintingsRounds = rounds.filter((r) => r.table === 'paintings');

          // If no rounds with table='paintings', skip this round
          if (paintingsRounds.length === 0) {
            return null;
          }

          const round = paintingsRounds[0]; // Usually only one round per name for non-ROUND_2
          return {
            roundId: round.roundId,
            name: roundName,
            isRound2: false,
            startDate: round.startDate,
            endDate: round.endDate,
            submissionDeadline: round.submissionDeadline,
            resultAnnounceDate: round.resultAnnounceDate,
            sendOriginalDeadline: round.sendOriginalDeadline,
            status: round.status,
            table: round.table,
          };
        }
      }),
    );

    // Filter out null values (rounds without table='paintings')
    const validRounds = formattedRounds.filter((r) => r !== null);

    return {
      success: true,
      data: validRounds,
      meta: {
        contestId,
        totalRounds: validRounds.length,
        roundTypes: Object.keys(groupedRounds).filter((roundName) => {
          const rounds = groupedRounds[roundName];
          if (roundName === 'ROUND_2') {
            return rounds.some(
              (r) => r.table && ['A', 'B', 'C', 'D'].includes(r.table),
            );
          }
          return rounds.some((r) => r.table === 'paintings');
        }),
      },
    };
  }

  async getRoundByName(contestId: number, name: string) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const round = await this.roundsRepository.findOne({
      where: { contestId, name },
    });

    if (!round) {
      throw new NotFoundException(
        `Round with name "${name}" not found in contest ${contestId}`,
      );
    }

    if (round.name === 'ROUND_2') {
      const allRound2Tables = await this.roundsRepository
        .createQueryBuilder('round')
        .where('round.contestId = :contestId', { contestId })
        .andWhere('round.name = :name', { name: 'ROUND_2' })
        .andWhere('round.table IN (:...tables)', {
          tables: ['A', 'B', 'C', 'D'],
        })
        .orderBy('round.table', 'ASC')
        .getMany();

      if (allRound2Tables.length === 0) {
        return {
          success: true,
          data: round,
          message: 'ROUND_2 found but no tables (A, B, C, D) created yet',
        };
      }

      const tablesWithCompetitors = await Promise.all(
        allRound2Tables.map(async (tableRound) => {
          const paintings = await this.paintingsRepository.find({
            where: { roundId: tableRound.roundId.toString() },
          });

          const competitorIds = [
            ...new Set(paintings.map((p) => p.competitorId)),
          ];

          const competitors = await Promise.all(
            competitorIds.map(async (competitorId) => {
              // Get competitor info from competitors table
              const competitor = await this.competitorsRepository.findOne({
                where: { competitorId },
              });

              // Get user info for additional details
              // const user = await this.usersRepository.findOne({
              //   where: { userId: competitorId },
              // });

              const competitorPaintings = paintings.filter(
                (p) => p.competitorId === competitorId,
              );

              return {
                competitorId: competitor?.competitorId,
                birthday: competitor?.birthday,
                schoolName: competitor?.schoolName,
                ward: competitor?.ward,
                grade: competitor?.grade,
                guardianId: competitor?.guardianId,
                // username: user?.username,
                // email: user?.email,
                // fullName: user?.fullName,
                paintings: competitorPaintings.map((p) => ({
                  paintingId: p.paintingId,
                  title: p.title,
                  imageUrl: p.imageUrl,
                  status: p.status,
                })),
              };
            }),
          );

          return {
            roundId: tableRound.roundId,
            table: tableRound.table,
            name: tableRound.name,
            startDate: tableRound.startDate,
            endDate: tableRound.endDate,
            submissionDeadline: tableRound.submissionDeadline,
            resultAnnounceDate: tableRound.resultAnnounceDate,
            sendOriginalDeadline: tableRound.sendOriginalDeadline,
            status: tableRound.status,
            competitors,
            competitorCount: competitors.length,
          };
        }),
      );

      return {
        success: true,
        data: {
          roundInfo: round,
          isRound2: true,
          tables: tablesWithCompetitors,
          totalCompetitors: tablesWithCompetitors.reduce(
            (sum, table) => sum + table.competitorCount,
            0,
          ),
        },
      };
    }

    return {
      success: true,
      data: {
        ...round,
        isRound2: false,
      },
    };
  }

  async getRoundById(contestId: number, roundId: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const round = await this.roundsRepository.findOne({
      where: { roundId, contestId },
    });

    if (!round) {
      throw new NotFoundException(
        `Round with ID ${roundId} not found in contest ${contestId}`,
      );
    }

    return {
      success: true,
      data: round,
    };
  }

  async updateRound(
    contestId: number,
    roundId: number,
    updateRoundDto: UpdateRoundDto,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const round = await this.roundsRepository.findOne({
      where: { roundId, contestId },
    });

    if (!round) {
      throw new NotFoundException(
        `Round with ID ${roundId} not found in contest ${contestId}`,
      );
    }

    if (updateRoundDto.name !== undefined) {
      round.name = updateRoundDto.name;
    }
    if (updateRoundDto.table !== undefined) {
      round.table = updateRoundDto.table;
    }
    if (updateRoundDto.startDate !== undefined) {
      round.startDate = updateRoundDto.startDate;
    }
    if (updateRoundDto.endDate !== undefined) {
      round.endDate = updateRoundDto.endDate;
    }
    if (updateRoundDto.submissionDeadline !== undefined) {
      round.submissionDeadline = updateRoundDto.submissionDeadline;
    }
    if (updateRoundDto.resultAnnounceDate !== undefined) {
      round.resultAnnounceDate = updateRoundDto.resultAnnounceDate;
    }
    if (updateRoundDto.sendOriginalDeadline !== undefined) {
      round.sendOriginalDeadline = updateRoundDto.sendOriginalDeadline;
    }
    if (updateRoundDto.status !== undefined) {
      round.status = updateRoundDto.status;
    }

    const savedRound = await this.roundsRepository.save(round);

    return {
      success: true,
      message: 'Round updated successfully',
      data: savedRound,
    };
  }

  async deleteRound(contestId: number, roundId: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const round = await this.roundsRepository.findOne({
      where: { roundId, contestId },
    });

    if (!round) {
      throw new NotFoundException(
        `Round with ID ${roundId} not found in contest ${contestId}`,
      );
    }

    await this.roundsRepository.remove(round);

    return {
      success: true,
      message: 'Round deleted successfully',
      data: {
        roundId,
        contestId,
      },
    };
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

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      success: true,
      data: paintings,
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

    return {
      success: true,
      data: painting,
    };
  }

  async reviewSubmission(paintingId: string, reviewDto: ReviewSubmissionDto) {
    const painting = await this.paintingsRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Submission with ID ${paintingId} not found`);
    }

    if (reviewDto.status === 'REJECTED' && !reviewDto.reason) {
      throw new BadRequestException(
        'Reason is required when rejecting a submission',
      );
    }
    painting.status = reviewDto.status;

    const updatedPainting = await this.paintingsRepository.save(painting);

    return {
      success: true,
      message: `Submission ${reviewDto.status.toLowerCase()} successfully`,
      data: {
        ...updatedPainting,
        rejectionReason: reviewDto.reason,
      },
    };
  }

  async acceptSubmission(paintingId: string) {
    return this.reviewSubmission(paintingId, { status: 'ACCEPTED' });
  }

  async rejectSubmission(paintingId: string, reason: string) {
    if (!reason) {
      throw new BadRequestException(
        'Reason is required when rejecting a submission',
      );
    }
    return this.reviewSubmission(paintingId, { status: 'REJECTED', reason });
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
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const examiner = await this.examinersRepository.findOne({
      where: { examinerId: assignExaminerDto.examiner_id },
    });

    if (!examiner) {
      throw new NotFoundException(
        `Examiner with ID ${assignExaminerDto.examiner_id} not found`,
      );
    }

    const existingAssignment = await this.contestExaminersRepository.findOne({
      where: {
        contestId: contestId,
        examinerId: assignExaminerDto.examiner_id,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        `Examiner ${assignExaminerDto.examiner_id} is already assigned to contest ${contestId}`,
      );
    }

    const contestExaminer = this.contestExaminersRepository.create({
      contestId: contestId,
      examinerId: assignExaminerDto.examiner_id,
      role: assignExaminerDto.role || 'EXAMINER',
      assignmentDate: new Date(),
    });

    const savedAssignment =
      await this.contestExaminersRepository.save(contestExaminer);

    const result = await this.contestExaminersRepository.findOne({
      where: {
        contestId: savedAssignment.contestId,
        examinerId: savedAssignment.examinerId,
      },
      relations: ['contest', 'examiner'],
    });

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

    const examiners = await this.contestExaminersRepository.find({
      where: { contestId },
      relations: ['examiner'],
    });

    const examinersWithNames = await Promise.all(
      examiners.map(async (ce) => {
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
      data: examinersWithNames,
    };
  }

  async removeExaminerFromContest(contestId: number, examinerId: string) {
    const assignment = await this.contestExaminersRepository.findOne({
      where: { contestId, examinerId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment not found for contest ${contestId} and examiner ${examinerId}`,
      );
    }

    await this.contestExaminersRepository.remove(assignment);

    return {
      success: true,
      message: 'Examiner removed from contest successfully',
    };
  }

  async createCampaign(data: {
    createCampaignDto: CreateCampaignDto;
    staffId: string;
    imageFile?: Express.Multer.File;
  }) {
    const user = await this.usersRepository.findOne({
      where: { userId: data.staffId },
    });
    const role = user?.role;
    if (role !== 'STAFF' && role !== 'ADMIN') {
      throw new BadRequestException(
        'Only staff or admin users can create campaigns',
      );
    }

    let imageUrl: string | undefined = undefined;

    // Upload image to Firebase Storage if provided
    if (data.imageFile) {
      try {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `campaigns/${Date.now()}-${data.imageFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(data.imageFile.buffer, {
          metadata: { contentType: data.imageFile.mimetype },
        });

        await fileUpload.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload image: ${error.message}`,
        );
      }
    }

    const campaignData: any = {
      ...data.createCampaignDto,
      staffId: data.staffId,
    };

    if (imageUrl) {
      campaignData.image = imageUrl;
    }

    const campaign = this.campaignsRepository.create(campaignData);
    await this.campaignsRepository.save(campaign);
    return {
      success: true,
      message: 'Campaign created successfully',
      data: campaign,
    };
  }

  async updateCampaign(
    campaignId: number,
    updateCampaignDto: any,
    imageFile?: Express.Multer.File,
    staffId?: string,
  ) {
    // Find existing campaign
    const campaign = await this.campaignsRepository.findOne({
      where: { campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    // Verify staff permission
    if (staffId) {
      const user = await this.usersRepository.findOne({
        where: { userId: staffId },
      });
      const role = user?.role;
      if (role !== 'STAFF' && role !== 'ADMIN') {
        throw new BadRequestException(
          'Only staff or admin users can update campaigns',
        );
      }
    }

    let imageUrl: string | undefined = undefined;

    // Upload new image to Firebase Storage if provided
    if (imageFile) {
      try {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `campaigns/${Date.now()}-${imageFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(imageFile.buffer, {
          metadata: { contentType: imageFile.mimetype },
        });

        await fileUpload.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload image: ${error.message}`,
        );
      }
    }

    // Merge update data
    const updateData: any = { ...updateCampaignDto };
    if (imageUrl) {
      updateData.image = imageUrl;
    }

    const updatedCampaign = this.campaignsRepository.merge(
      campaign,
      updateData,
    );
    await this.campaignsRepository.save(updatedCampaign);

    return {
      success: true,
      message: 'Campaign updated successfully',
      data: updatedCampaign,
    };
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
    const user = await this.usersRepository.findOne({
      where: { userId: createScheduleDto.examinerId, role: UserRole.EXAMINER },
    });

    if (!user) {
      throw new NotFoundException(
        `Examiner with ID ${createScheduleDto.examinerId} not found`,
      );
    }

    const contest = await this.contestsRepository.findOne({
      where: { contestId: createScheduleDto.contestId },
    });

    if (!contest) {
      throw new NotFoundException(
        `Contest with ID ${createScheduleDto.contestId} not found`,
      );
    }

    const contestExaminer = await this.contestExaminersRepository.findOne({
      where: {
        contestId: createScheduleDto.contestId,
        examinerId: createScheduleDto.examinerId,
      },
    });

    if (!contestExaminer) {
      throw new BadRequestException(
        `Examiner with ID ${createScheduleDto.examinerId} is not assigned to contest ${createScheduleDto.contestId}`,
      );
    }

    const schedule = this.schedulesRepository.create({
      ...createScheduleDto,
      date: new Date(createScheduleDto.date),
    });

    const savedSchedule = await this.schedulesRepository.save(schedule);

    let examiner = await this.examinersRepository.findOne({
      where: { examinerId: createScheduleDto.examinerId },
    });

    if (!examiner) {
      examiner = this.examinersRepository.create({
        examinerId: createScheduleDto.examinerId,
        assignedScheduleId: savedSchedule.scheduleId,
      });
      await this.examinersRepository.save(examiner);
    } else if (!examiner.assignedScheduleId) {
      examiner.assignedScheduleId = savedSchedule.scheduleId;
      await this.examinersRepository.save(examiner);
    }

    return {
      success: true,
      message: 'Schedule created successfully',
      data: savedSchedule,
    };
  }

  async getSchedulesByExaminer(examinerId: string) {
    const schedules = await this.schedulesRepository.find({
      where: { examinerId },
      order: { date: 'ASC' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedulesWithCanEvaluate = await Promise.all(
      schedules.map(async (schedule) => {
        const contest = await this.contestsRepository.findOne({
          where: { contestId: schedule.contestId },
        });

        let canEvaluate = false;

        if (!contest || !contest.isScheduleEnforced) {
          canEvaluate = schedule.status === 'ACTIVE';
        } else {
          const scheduleDate = new Date(schedule.date);
          scheduleDate.setHours(0, 0, 0, 0);

          canEvaluate =
            schedule.status === 'ACTIVE' &&
            scheduleDate.getTime() === today.getTime();
        }

        return {
          ...schedule,
          canEvaluate,
          isScheduleEnforced: contest?.isScheduleEnforced || false,
        };
      }),
    );

    return {
      success: true,
      data: schedulesWithCanEvaluate,
      meta: {
        total: schedules.length,
      },
    };
  }

  async getSchedulesByContest(contestId: number) {
    const schedules = await this.schedulesRepository.find({
      where: { contestId },
      order: { date: 'ASC' },
    });

    const schedulesWithExaminer = await Promise.all(
      schedules.map(async (schedule) => {
        const user = await this.usersRepository.findOne({
          where: { userId: schedule.examinerId },
        });

        return {
          ...schedule,
          examinerName: user?.fullName || 'Unknown',
          examinerEmail: user?.email || null,
        };
      }),
    );

    return {
      success: true,
      data: schedulesWithExaminer,
      meta: {
        total: schedulesWithExaminer.length,
      },
    };
  }

  async updateSchedule(
    scheduleId: number,
    updateScheduleDto: UpdateScheduleDto,
  ) {
    const schedule = await this.schedulesRepository.findOne({
      where: { scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    if (updateScheduleDto.date && updateScheduleDto.date.trim() !== '') {
      (updateScheduleDto as any).date = new Date(updateScheduleDto.date);
    } else if (updateScheduleDto.date === '') {
      delete (updateScheduleDto as any).date;
    }

    Object.assign(schedule, updateScheduleDto);
    const updatedSchedule = await this.schedulesRepository.save(schedule);

    return {
      success: true,
      message: 'Schedule updated successfully',
      data: updatedSchedule,
    };
  }

  async deleteSchedule(scheduleId: number) {
    const schedule = await this.schedulesRepository.findOne({
      where: { scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    await this.schedulesRepository.remove(schedule);

    return {
      success: true,
      message: 'Schedule deleted successfully',
    };
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
    if (tablesToCreate < 2 || tablesToCreate > 26) {
      throw new BadRequestException(
        'Number of tables must be between 2 and 26 (A-Z)',
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

    const passedPaintings = await this.paintingsRepository.find({
      where: {
        contestId,
        status: 'ACCEPTED',
      },
    });

    if (passedPaintings.length === 0) {
      throw new BadRequestException(
        'No passed paintings found for this contest',
      );
    }

    const uniqueCompetitorIds = [
      ...new Set(passedPaintings.map((p) => p.competitorId)),
    ];

    if (uniqueCompetitorIds.length < tablesToCreate) {
      throw new BadRequestException(
        `Need at least ${tablesToCreate} competitors to create ${tablesToCreate} tables. Found only ${uniqueCompetitorIds.length} competitors`,
      );
    }

    const round2Limit = contest.round2Quantity || uniqueCompetitorIds.length;

    if (uniqueCompetitorIds.length < round2Limit) {
      throw new BadRequestException(
        `Contest configured for ${round2Limit} competitors in ROUND_2, but only ${uniqueCompetitorIds.length} competitors passed ROUND_1`,
      );
    }

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

    const topCompetitors = competitorScores.slice(0, round2Limit);

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
        const painting = this.paintingsRepository.create({
          competitorId,
          contestId,
          roundId: savedRound.roundId.toString(),
          title: `ROUND_2 - Table ${tableNames[i]} - Pending Upload`,
          description: `Painting for ROUND_2, Table ${tableNames[i]}. Waiting for examiner to upload.`,
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
        (p) => p.roundId === createdRounds[i].roundId.toString(),
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
        passedPaintingsCount: passedPaintings.length,
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
      where: { roundId: parseInt(painting.roundId) },
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
}
