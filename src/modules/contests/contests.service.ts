import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Contest, ContestStatus } from './entities/contests.entity';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { GetContestDto } from './dto/get-contest.dto';
import { GetAllContestsDto } from './dto/get-all-contests.dto';
import { AssignExaminerDto } from './dto/assign-examiner.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { Round } from './entities/round.entity';
import { ContestExaminer } from './entities/contest-examiner.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { User } from '../users/entities/user.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Award } from '../awards/entities/award.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { CreateRoundDto } from './dto/create-round.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Round)
    private roundsRepository: Repository<Round>,
    @InjectRepository(ContestExaminer)
    private contestExaminerRepository: Repository<ContestExaminer>,
    @InjectRepository(Examiner)
    private examinerRepository: Repository<Examiner>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Competitor)
    private competitorRepository: Repository<Competitor>,
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Award)
    private awardRepository: Repository<Award>,
    @InjectRepository(Painting)
    private paintingRepository: Repository<Painting>,
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

    const rounds = await this.roundsRepository.find({
      where: { contestId: id },
    });

    const contestExaminers = await this.contestExaminerRepository.find({
      where: { contestId: id },
      relations: ['examiner'],
    });

    const examinersWithNames = await Promise.all(
      contestExaminers.map(async (ce) => {
        const user = await this.userRepository.findOne({
          where: { userId: ce.examinerId },
        });

        return {
          ...ce,
          examinerName: user?.fullName || 'Unknown',
          examinerEmail: user?.email || null,
        };
      }),
    );

    const awards = await this.awardRepository.find({
      where: { contestId: id },
      order: { rank: 'ASC' },
    });

    const winnerPaintings = await this.paintingRepository.find({
      where: { contestId: id },
      relations: ['award'],
    });

    const winners = await Promise.all(
      winnerPaintings
        .filter((p) => p.awardId !== null)
        .map(async (painting) => {
          const competitor = await this.userRepository.findOne({
            where: { userId: painting.competitorId },
          });

          return {
            paintingId: painting.paintingId,
            title: painting.title,
            imageUrl: painting.imageUrl,
            competitorId: painting.competitorId,
            competitorName: competitor?.fullName || 'Unknown',
            competitorEmail: competitor?.email || null,
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
    const examiner = await this.examinerRepository.findOne({
      where: { examinerId },
    });
    if (!examiner) {
      throw new NotFoundException(`Examiner with ID ${examinerId} not found`);
    }
    const contestExaminers = await this.contestExaminerRepository.find({
      where: { examinerId },
      relations: ['contest'],
    });

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
      const round = await this.roundsRepository.find({
        where: { contestId: contest.contestId, name: 'ROUND1' },
      });
      (contest as any).roundId = round.length > 0 ? round[0].roundId : null;

      const examinerRelation = contestExaminers.find(
        (ce) => ce.contestId === contest.contestId,
      );
      if (examinerRelation) {
        (contest as any).assignmentStatus = examinerRelation.status;
        (contest as any).assignmentDate = examinerRelation.assignmentDate;
        (contest as any).examinerRole = examinerRelation.role;
      }

      // Kiểm tra canEvaluate dựa trên schedule và isScheduleEnforced
      const schedule = await this.scheduleRepository.findOne({
        where: {
          examinerId: examinerId,
          contestId: contest.contestId,
          status: 'ACTIVE',
        },
      });

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

    const examiner = await this.examinerRepository.findOne({
      where: { examinerId: assignExaminerDto.examiner_id },
    });

    if (!examiner) {
      throw new NotFoundException(
        `Examiner with ID ${assignExaminerDto.examiner_id} not found`,
      );
    }

    const existingAssignment = await this.contestExaminerRepository.findOne({
      where: {
        contestId,
        examinerId: assignExaminerDto.examiner_id,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        `Examiner ${assignExaminerDto.examiner_id} is already assigned to contest ${contestId}`,
      );
    }

    const contestExaminer = this.contestExaminerRepository.create({
      contestId,
      examinerId: assignExaminerDto.examiner_id,
      role: assignExaminerDto.role || 'EXAMINER',
      assignmentDate: new Date(),
    });

    const savedAssignment =
      await this.contestExaminerRepository.save(contestExaminer);

    const result = await this.contestExaminerRepository.findOne({
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

    const examiners = await this.contestExaminerRepository.find({
      where: { contestId },
      relations: ['examiner'],
    });

    const examinersWithNames = await Promise.all(
      examiners.map(async (ce) => {
        const user = await this.userRepository.findOne({
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
    const assignment = await this.contestExaminerRepository.findOne({
      where: { contestId, examinerId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment not found for contest ${contestId} and examiner ${examinerId}`,
      );
    }

    await this.contestExaminerRepository.remove(assignment);

    return {
      success: true,
      message: 'Examiner removed from contest successfully',
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

  async getRoundsByContest(contestId: number, _queryDto?: PaginationDto) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const allRounds = await this.roundsRepository.find({
      where: { contestId },
      order: { name: 'ASC', table: 'ASC' },
    });

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

    const formattedRounds = await Promise.all(
      Object.entries(groupedRounds).map(async ([roundName, rounds]) => {
        if (roundName === 'ROUND_2') {
          const tablesData = await Promise.all(
            rounds
              .filter((r) => r.table && /^[A-Z]$/.test(r.table))
              .map(async (tableRound) => {
                const paintingCount = await this.paintingRepository.count({
                  where: {
                    roundId: tableRound.roundId,
                    status: In([
                      'PENDING',
                      'ACCEPTED',
                      'ORIGINAL_SUBMITTED',
                      'NOT_SUBMITTED_ORIGINAL',
                    ]),
                  },
                });

                return {
                  roundId: tableRound.roundId,
                  table: tableRound.table,
                  startDate: tableRound.startDate,
                  endDate: tableRound.endDate,
                  submissionDeadline: tableRound.submissionDeadline,
                  resultAnnounceDate: tableRound.resultAnnounceDate,
                  sendOriginalDeadline: tableRound.sendOriginalDeadline,
                  status: tableRound.status,
                  totalPaintings: paintingCount,
                };
              }),
          );

          return {
            name: roundName,
            isRound2: true,
            tables: tablesData,
            totalTables: tablesData.length,
          };
        }

        const paintingsRounds = rounds.filter((r) => r.table === 'paintings');

        if (paintingsRounds.length === 0) {
          return null;
        }

        const round = paintingsRounds[0];

        const paintingCount = await this.paintingRepository.count({
          where: {
            roundId: round.roundId,
            status: In([
              'PENDING',
              'ACCEPTED',
              'ORIGINAL_SUBMITTED',
              'NOT_SUBMITTED_ORIGINAL',
            ]),
          },
        });

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
          totalPaintings: paintingCount,
        };
      }),
    );

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
            return rounds.some((r) => r.table && /^[A-Z]$/.test(r.table));
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
          const paintings = await this.paintingRepository.find({
            where: { roundId: tableRound.roundId },
          });

          const competitorIds = [
            ...new Set(paintings.map((p) => p.competitorId)),
          ];

          const competitors = await Promise.all(
            competitorIds.map(async (competitorId) => {
              const competitor = await this.competitorRepository.findOne({
                where: { competitorId },
              });

              const user = await this.userRepository.findOne({
                where: { userId: competitorId },
              });

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
                username: user?.username,
                email: user?.email,
                fullName: user?.fullName,
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
      const existingRounds = await this.roundsRepository.find({
        where: { contestId: id },
      });

      if (existingRounds.length > 0) {
        await this.roundsRepository.remove(existingRounds);
      }

      for (const roundDto of rounds) {
        const round = this.roundsRepository.create({
          contestId: id,
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
    const round1 = await this.roundsRepository.findOne({
      where: {
        contestId: contestId,
        name: 'ROUND_1',
      },
    });

    if (!round1) {
      throw new NotFoundException(`ROUND_1 not found for contest ${contestId}`);
    }

    const userIdArray = Array.isArray(userIds) ? userIds : [userIds];

    const uploadStatusResults = await Promise.all(
      userIdArray.map(async (userId) => {
        const painting = await this.paintingRepository.findOne({
          where: {
            competitorId: userId,
            contestId: contestId,
            roundId: round1.roundId,
          },
        });

        return {
          userId: userId,
          isUploaded: !!painting,
        };
      }),
    );

    return {
      success: true,
      data: uploadStatusResults,
    };
  }
}
