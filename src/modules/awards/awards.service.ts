import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Award } from './entities/award.entity';
import { CreateAwardDto } from './dto/create-award.dto';
import { UpdateAwardDto } from './dto/update-award.dto';
import { CreateAwardsBatchDto } from './dto/create-awards-batch.dto';
import { ContestsQueryService } from '../contests/contests-query.service';
import { UsersService } from '../users/users.service';
import { PaintingsService } from '../paintings/paintings.service';

@Injectable()
export class AwardsService {
  constructor(
    @InjectRepository(Award)
    private readonly awardRepository: Repository<Award>,
    private readonly contestsQueryService: ContestsQueryService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => PaintingsService))
    private readonly paintingsService: PaintingsService,
  ) {}

  /**
   * Helper: Tính điểm trung bình của một painting từ các đánh giá
   * Ưu tiên scoreRound2, nếu không có thì dùng scoreRound1
   */
  private async calculateAverageScore(
    paintingId: string,
  ): Promise<number | null> {
    return this.paintingsService.calculateAverageScoreFromEvaluations(
      paintingId,
    );
  }

  private async recomputeContestNumOfAward(contestId: number) {
    const contest = await this.contestsQueryService.findContestById(contestId);
    if (!contest) {
      return null;
    }

    const allContestAwards = await this.awardRepository.find({
      where: { contestId },
    });
    const totalQuantity = allContestAwards.reduce(
      (sum, award) => sum + (award.quantity || 0),
      0,
    );

    await this.contestsQueryService.updateContestNumOfAward(
      contestId,
      totalQuantity,
    );

    return {
      totalQuantity,
      totalAwards: allContestAwards.length,
    };
  }

  async create(createAwardDto: CreateAwardDto) {
    const contest = await this.contestsQueryService.findContestById(
      createAwardDto.contestId,
    );

    if (!contest) {
      throw new NotFoundException(
        `Contest with ID ${createAwardDto.contestId} not found`,
      );
    }

    const award = this.awardRepository.create(createAwardDto);
    const savedAward = await this.awardRepository.save(award);

    const contestStats = await this.recomputeContestNumOfAward(
      createAwardDto.contestId,
    );

    return {
      success: true,
      message: 'Award created successfully',
      data: savedAward,
      meta: {
        contestNumOfAward: contestStats?.totalQuantity ?? 0,
        totalAwardsInContest: contestStats?.totalAwards ?? 0,
      },
    };
  }

  async countAwards(where?: any) {
    if (!where) {
      return this.awardRepository.count();
    }

    return this.awardRepository.count({ where });
  }

  async createBatch(createAwardsBatchDto: CreateAwardsBatchDto) {
    const awards = createAwardsBatchDto.awards;

    const contestIds = [...new Set(awards.map((a) => a.contestId))];

    for (const contestId of contestIds) {
      const contest =
        await this.contestsQueryService.findContestById(contestId);

      if (!contest) {
        throw new NotFoundException(`Contest with ID ${contestId} not found`);
      }
    }

    const createdAwards = this.awardRepository.create(awards);
    const savedAwards = await this.awardRepository.save(createdAwards);
    const totalQuantity = savedAwards.reduce(
      (sum, award) => sum + (award.quantity || 0),
      0,
    );

    const updatedContests: Array<{
      contestId: number;
      numOfAward: number;
      totalAwards: number;
    }> = [];
    for (const contestId of contestIds) {
      const contestStats = await this.recomputeContestNumOfAward(contestId);
      updatedContests.push({
        contestId,
        numOfAward: contestStats?.totalQuantity ?? 0,
        totalAwards: contestStats?.totalAwards ?? 0,
      });
    }

    return {
      success: true,
      message: `${savedAwards.length} awards created successfully`,
      data: savedAwards,
      meta: {
        total: savedAwards.length,
        totalQuantity: totalQuantity,
        contestIds: contestIds,
        updatedContests: updatedContests,
      },
    };
  }

  async findAll() {
    const awards = await this.awardRepository.find({
      relations: ['contest'],
      order: { contestId: 'DESC', rank: 'ASC' },
    });

    return {
      success: true,
      data: awards,
      meta: {
        total: awards.length,
      },
    };
  }

  async findByContestId(contestId: number) {
    const contest = await this.contestsQueryService.findContestById(contestId);

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const awards = await this.awardRepository.find({
      where: { contestId },
      order: { rank: 'ASC' },
      relations: ['paintings'],
    });

    const awardsWithCompetitorInfo = await Promise.all(
      awards.map(async (award) => {
        if (award.paintings && award.paintings.length > 0) {
          const paintingsWithCompetitor = await Promise.all(
            award.paintings.map(async (painting) => {
              let competitorName;
              let competitorEmail;

              // Lấy thông tin competitor
              if (painting.competitorId) {
                const competitor = await this.usersService.findUserById(
                  painting.competitorId,
                );
                competitorName = competitor?.fullName || null;
                competitorEmail = competitor?.email || null;
              }

              // Tính điểm trung bình sử dụng helper
              const averageScore = await this.calculateAverageScore(
                painting.paintingId,
              );

              return {
                ...painting,
                competitorName,
                competitorEmail,
                averageScore: averageScore || 0,
              };
            }),
          );

          return {
            ...award,
            paintings: paintingsWithCompetitor,
          };
        }
        return award;
      }),
    );

    return {
      success: true,
      data: awardsWithCompetitorInfo,
      meta: {
        contestId,
        total: awards.length,
      },
    };
  }

  async listByContestId(contestId: number) {
    return this.awardRepository.find({
      where: { contestId },
      order: { rank: 'ASC' },
    });
  }

  async findById(awardId: number) {
    return this.awardRepository.findOne({
      where: { awardId },
    });
  }

  async findByIdWithPaintings(awardId: number) {
    return this.awardRepository.findOne({
      where: { awardId },
      relations: ['paintings'],
    });
  }

  async findByIdAndContest(awardId: number, contestId: number) {
    return this.awardRepository.findOne({
      where: { awardId, contestId },
    });
  }

  async listByContestWithRanks(contestId: number, ranks: number[]) {
    return this.awardRepository.find({
      where: {
        contestId,
        rank: In(ranks),
      },
      order: {
        rank: 'ASC',
      },
    });
  }

  async listByContestExcludingRanks(contestId: number, ranks: number[]) {
    return this.awardRepository.find({
      where: {
        contestId,
        rank: Not(In(ranks)),
      },
      order: {
        rank: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const award = await this.awardRepository.findOne({
      where: { awardId: id },
      relations: ['contest', 'paintings'],
    });

    if (!award) {
      throw new NotFoundException(`Award with ID ${id} not found`);
    }

    return {
      success: true,
      data: award,
    };
  }

  async update(id: number, updateAwardDto: UpdateAwardDto) {
    const award = await this.awardRepository.findOne({
      where: { awardId: id },
    });

    if (!award) {
      throw new NotFoundException(`Award with ID ${id} not found`);
    }

    if (
      updateAwardDto.contestId &&
      updateAwardDto.contestId !== award.contestId
    ) {
      const contest = await this.contestsQueryService.findContestById(
        updateAwardDto.contestId,
      );

      if (!contest) {
        throw new NotFoundException(
          `Contest with ID ${updateAwardDto.contestId} not found`,
        );
      }
    }

    const oldContestId = award.contestId;

    Object.assign(award, updateAwardDto);
    const updatedAward = await this.awardRepository.save(award);

    // Update num_of_award in contest (both old and new contest if changed)
    const affectedContestIds = [oldContestId];
    if (updateAwardDto.contestId && updateAwardDto.contestId !== oldContestId) {
      affectedContestIds.push(updateAwardDto.contestId);
    }

    for (const contestId of affectedContestIds) {
      await this.recomputeContestNumOfAward(contestId);
    }

    return {
      success: true,
      message: 'Cập nhật giải thưởng thành công',
      data: updatedAward,
    };
  }

  async remove(id: number) {
    const award = await this.awardRepository.findOne({
      where: { awardId: id },
    });

    if (!award) {
      throw new NotFoundException(`Giải thưởng với ID ${id} không tìm thấy`);
    }

    const contestId = award.contestId;
    await this.awardRepository.remove(award);

    // Update num_of_award in contest after deletion
    await this.recomputeContestNumOfAward(contestId);

    return {
      success: true,
      message: 'Cập nhật giải thưởng thành công',
    };
  }
}
