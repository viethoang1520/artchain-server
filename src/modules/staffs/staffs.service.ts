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
import { Campaign } from '../campaigns/entities/campaign.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { CreateScheduleDto } from '../schedules/dto/create-schedule.dto';
import { UpdateScheduleDto } from '../schedules/dto/update-schedule.dto';

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
  ) {}

  async createContest(createContestDto: CreateContestDto) {
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

  async updateContest(id: number, updateContestDto: UpdateContestDto) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    const updatedContest = this.contestsRepository.merge(
      contest,
      updateContestDto,
    );
    const savedContest = await this.contestsRepository.save(updatedContest);

    return {
      success: true,
      message: 'Contest updated successfully',
      data: savedContest,
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

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const [rounds, total] = await this.roundsRepository.findAndCount({
      where: { contestId },
      order: { roundId: 'ASC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      success: true,
      data: rounds,
      meta: {
        contestId,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async getRound(contestId: number, roundId: number) {
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
    const campaign = this.campaignsRepository.create({
      ...data.createCampaignDto,
      staffId: data.staffId,
    });
    await this.campaignsRepository.save(campaign);
    return {
      success: true,
      message: 'Campaign created successfully',
      data: campaign,
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

    return {
      success: true,
      data: schedules,
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

    // Only update date if it's provided and not empty
    if (updateScheduleDto.date && updateScheduleDto.date.trim() !== '') {
      (updateScheduleDto as any).date = new Date(updateScheduleDto.date);
    } else if (updateScheduleDto.date === '') {
      // If empty string is sent, remove it from update
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
}
