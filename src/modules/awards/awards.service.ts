import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Award } from './entities/award.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Evaluation } from '../paintings/entities/evaluation.entity';
import { User } from '../users/entities/user.entity';
import { CreateAwardDto } from './dto/create-award.dto';
import { UpdateAwardDto } from './dto/update-award.dto';
import { CreateAwardsBatchDto } from './dto/create-awards-batch.dto';

@Injectable()
export class AwardsService {
  constructor(
    @InjectRepository(Award)
    private readonly awardRepository: Repository<Award>,
    @InjectRepository(Contest)
    private readonly contestRepository: Repository<Contest>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Helper: Tính điểm trung bình của một painting từ các đánh giá
   * Ưu tiên scoreRound2, nếu không có thì dùng scoreRound1
   */
  private async calculateAverageScore(
    paintingId: string,
  ): Promise<number | null> {
    const evaluations = await this.evaluationRepository.find({
      where: { paintingId },
    });

    if (evaluations.length === 0) {
      return null;
    }

    let totalScore = 0;
    let count = 0;

    evaluations.forEach((evaluation) => {
      // Ưu tiên scoreRound2, nếu không có thì dùng scoreRound1
      const score =
        evaluation.scoreRound2 !== null && evaluation.scoreRound2 !== undefined
          ? evaluation.scoreRound2
          : evaluation.scoreRound1;

      if (score !== null && score !== undefined) {
        totalScore += score;
        count++;
      }
    });

    if (count === 0) {
      return null;
    }

    return parseFloat((totalScore / count).toFixed(2));
  }

  async create(createAwardDto: CreateAwardDto) {
    const contest = await this.contestRepository.findOne({
      where: { contestId: createAwardDto.contestId },
    });

    if (!contest) {
      throw new NotFoundException(
        `Contest with ID ${createAwardDto.contestId} not found`,
      );
    }

    const award = this.awardRepository.create(createAwardDto);
    const savedAward = await this.awardRepository.save(award);

    const allContestAwards = await this.awardRepository.find({
      where: { contestId: createAwardDto.contestId },
    });
    const totalQuantity = allContestAwards.reduce(
      (sum, award) => sum + (award.quantity || 0),
      0,
    );

    contest.numOfAward = totalQuantity;
    await this.contestRepository.save(contest);

    return {
      success: true,
      message: 'Award created successfully',
      data: savedAward,
      meta: {
        contestNumOfAward: totalQuantity,
        totalAwardsInContest: allContestAwards.length,
      },
    };
  }

  async createBatch(createAwardsBatchDto: CreateAwardsBatchDto) {
    const awards = createAwardsBatchDto.awards;

    const contestIds = [...new Set(awards.map((a) => a.contestId))];

    const contests: Contest[] = [];
    for (const contestId of contestIds) {
      const contest = await this.contestRepository.findOne({
        where: { contestId },
      });

      if (!contest) {
        throw new NotFoundException(`Contest with ID ${contestId} not found`);
      }
      contests.push(contest);
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
    for (const contest of contests) {
      const allContestAwards = await this.awardRepository.find({
        where: { contestId: contest.contestId },
      });

      const contestTotalQuantity = allContestAwards.reduce(
        (sum, award) => sum + (award.quantity || 0),
        0,
      );

      contest.numOfAward = contestTotalQuantity;
      await this.contestRepository.save(contest);

      updatedContests.push({
        contestId: contest.contestId,
        numOfAward: contestTotalQuantity,
        totalAwards: allContestAwards.length,
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
    const contest = await this.contestRepository.findOne({
      where: { contestId },
    });

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
                const competitor = await this.usersRepository.findOne({
                  where: { userId: painting.competitorId },
                });
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
      const contest = await this.contestRepository.findOne({
        where: { contestId: updateAwardDto.contestId },
      });

      if (!contest) {
        throw new NotFoundException(
          `Contest with ID ${updateAwardDto.contestId} not found`,
        );
      }
    }

    Object.assign(award, updateAwardDto);
    const updatedAward = await this.awardRepository.save(award);

    // Update num_of_award in contest (both old and new contest if changed)
    const affectedContestIds = [award.contestId];
    if (
      updateAwardDto.contestId &&
      updateAwardDto.contestId !== award.contestId
    ) {
      affectedContestIds.push(updateAwardDto.contestId);
    }

    for (const contestId of affectedContestIds) {
      const contest = await this.contestRepository.findOne({
        where: { contestId },
      });
      if (contest) {
        const allContestAwards = await this.awardRepository.find({
          where: { contestId },
        });
        const totalQuantity = allContestAwards.reduce(
          (sum, a) => sum + (a.quantity || 0),
          0,
        );
        contest.numOfAward = totalQuantity;
        await this.contestRepository.save(contest);
      }
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
    const contest = await this.contestRepository.findOne({
      where: { contestId },
    });
    if (contest) {
      const allContestAwards = await this.awardRepository.find({
        where: { contestId },
      });
      const totalQuantity = allContestAwards.reduce(
        (sum, a) => sum + (a.quantity || 0),
        0,
      );
      contest.numOfAward = totalQuantity;
      await this.contestRepository.save(contest);
    }

    return {
      success: true,
      message: 'Cập nhật giải thưởng thành công',
    };
  }
}
