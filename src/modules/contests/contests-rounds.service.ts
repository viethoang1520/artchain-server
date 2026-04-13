import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Contest } from './entities/contests.entity';
import { Round } from './entities/round.entity';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaintingsService } from '../paintings/paintings.service';
import { CompetitorsService } from '../competitors/competitor.service';

@Injectable()
export class ContestsRoundsService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Round)
    private roundsRepository: Repository<Round>,
    private paintingsService: PaintingsService,
    private competitorsService: CompetitorsService,
  ) {}

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

  async listByContestId(contestId: number) {
    return this.roundsRepository.find({
      where: { contestId },
    });
  }

  async listByContestIdOrdered(contestId: number) {
    return this.roundsRepository.find({
      where: { contestId },
      order: { roundId: 'ASC' },
    });
  }

  async findByContestAndName(contestId: number, name: string) {
    return this.roundsRepository.findOne({
      where: { contestId, name },
    });
  }

  async createRoundsForContest(contestId: number, rounds: any[]) {
    const savedRounds: Round[] = [];

    for (const roundDto of rounds) {
      const round = this.roundsRepository.create({
        contestId,
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

    return savedRounds;
  }

  async upsertRound1ForContest(contestId: number, roundData: any) {
    const existingRound = await this.findByContestAndName(contestId, 'ROUND_1');

    if (existingRound) {
      const updatedRound = this.roundsRepository.merge(
        existingRound,
        roundData,
      );
      return this.roundsRepository.save(updatedRound);
    }

    const newRound = this.roundsRepository.create({
      ...roundData,
      contestId,
      name: roundData.name || 'ROUND_1',
    });

    return this.roundsRepository.save(newRound);
  }

  async replaceRoundsForContest(contestId: number, rounds: any[]) {
    const existingRounds = await this.roundsRepository.find({
      where: { contestId },
    });

    if (existingRounds.length > 0) {
      await this.roundsRepository.remove(existingRounds);
    }

    return this.createRoundsForContest(contestId, rounds);
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
                const paintingCount =
                  await this.paintingsService.countQualifiedByRound(
                    tableRound.roundId,
                  );

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

        const paintingCount = await this.paintingsService.countQualifiedByRound(
          round.roundId,
        );

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
          const paintings = await this.paintingsService.listByRoundId(
            tableRound.roundId,
          );

          const competitorIds = [
            ...new Set(paintings.map((p) => p.competitorId)),
          ];

          const competitors = await Promise.all(
            competitorIds.map(async (competitorId) => {
              const { competitor, user } =
                await this.competitorsService.getCompetitorWithUser(
                  competitorId,
                );

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
}
