import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Vote } from './entities/vote.entity';
import { CreateVoteDto } from './dto/create-vote.dto';
import { Painting } from '../paintings/entities/paintings.entity';
import { Evaluation } from '../paintings/entities/evaluation.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Award } from '../awards/entities/award.entity';
import { Round } from '../contests/entities/round.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private readonly votesRepository: Repository<Vote>,
    @InjectRepository(Painting)
    private readonly paintingsRepository: Repository<Painting>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    @InjectRepository(Contest)
    private readonly contestsRepository: Repository<Contest>,
    @InjectRepository(Award)
    private readonly awardsRepository: Repository<Award>,
    @InjectRepository(Round)
    private readonly roundsRepository: Repository<Round>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Helper: Tính điểm trung bình của một painting từ các đánh giá
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
      const score =
        evaluation.scoreRound2 !== null && evaluation.scoreRound2 !== undefined
          ? evaluation.scoreRound2
          : 0;

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

  private async calculateDetailedAverageScores(paintingId: string): Promise<{
    avgScoreRound2: number;
    avgCreativityScore: number;
    avgCompositionScore: number;
    avgColorScore: number;
    avgTechnicalScore: number;
    avgAestheticScore: number;
    evaluationCount: number;
  }> {
    const evaluations = await this.evaluationRepository.find({
      where: { paintingId },
    });

    if (evaluations.length === 0) {
      return {
        avgScoreRound2: 0,
        avgCreativityScore: 0,
        avgCompositionScore: 0,
        avgColorScore: 0,
        avgTechnicalScore: 0,
        avgAestheticScore: 0,
        evaluationCount: 0,
      };
    }

    const validScores = evaluations.filter(
      (e) => e.scoreRound2 !== null && e.scoreRound2 !== undefined,
    );

    if (validScores.length === 0) {
      return {
        avgScoreRound2: 0,
        avgCreativityScore: 0,
        avgCompositionScore: 0,
        avgColorScore: 0,
        avgTechnicalScore: 0,
        avgAestheticScore: 0,
        evaluationCount: 0,
      };
    }

    const totalScore = validScores.reduce(
      (sum, evaluation) => sum + evaluation.scoreRound2,
      0,
    );
    const totalCreativity = validScores.reduce(
      (sum, evaluation) => sum + (evaluation.creativityScore || 0),
      0,
    );
    const totalComposition = validScores.reduce(
      (sum, evaluation) => sum + (evaluation.compositionScore || 0),
      0,
    );
    const totalColor = validScores.reduce(
      (sum, evaluation) => sum + (evaluation.colorScore || 0),
      0,
    );
    const totalTechnical = validScores.reduce(
      (sum, evaluation) => sum + (evaluation.technicalScore || 0),
      0,
    );
    const totalAesthetic = validScores.reduce(
      (sum, evaluation) => sum + (evaluation.aestheticScore || 0),
      0,
    );

    return {
      avgScoreRound2: Math.round((totalScore / validScores.length) * 100) / 100,
      avgCreativityScore:
        Math.round((totalCreativity / validScores.length) * 100) / 100,
      avgCompositionScore:
        Math.round((totalComposition / validScores.length) * 100) / 100,
      avgColorScore: Math.round((totalColor / validScores.length) * 100) / 100,
      avgTechnicalScore:
        Math.round((totalTechnical / validScores.length) * 100) / 100,
      avgAestheticScore:
        Math.round((totalAesthetic / validScores.length) * 100) / 100,
      evaluationCount: validScores.length,
    };
  }

  async getVotableAwards(contestId: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });
    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const awards = await this.awardsRepository.find({
      where: {
        contestId,
        rank: Not(In([1, 2, 3])),
      },
      order: {
        rank: 'ASC',
      },
    });

    const awardsWithStats = await Promise.all(
      awards.map(async (award) => {
        const totalVotes = await this.votesRepository.count({
          where: {
            contestId,
            awardId: award.awardId,
          },
        });

        return {
          awardId: award.awardId,
          name: award.name,
          description: award.description,
          rank: award.rank,
          prize: award.prize,
          quantity: award.quantity,
          totalVotes,
        };
      }),
    );

    return {
      success: true,
      data: {
        contestId,
        contestTitle: contest.title,
        awards: awardsWithStats,
      },
    };
  }

  async getPaintingsForAward(
    contestId: number,
    awardId: number,
    accountId?: string,
  ) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId },
    });
    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const award = await this.awardsRepository.findOne({
      where: { awardId, contestId },
    });
    if (!award) {
      throw new NotFoundException(
        `Award with ID ${awardId} not found in this contest`,
      );
    }

    if ([1, 2, 3].includes(award.rank)) {
      throw new BadRequestException(
        'Cannot vote for top 3 awards (1st, 2nd, 3rd place). These are determined by examiners.',
      );
    }

    const round2Rounds = await this.roundsRepository.find({
      where: {
        contestId,
      },
    });

    const round2Tables = round2Rounds.filter(
      (round) =>
        round.name &&
        (round.name.toUpperCase().includes('ROUND_2') ||
          round.name.toUpperCase().includes('ROUND 2')),
    );

    if (round2Tables.length === 0) {
      throw new BadRequestException(
        'Round 2 not found for this contest. Please create Round 2 tables first.',
      );
    }

    const round2Ids = round2Tables.map((r) => r.roundId.toString());

    const topAwards = await this.awardsRepository.find({
      where: {
        contestId,
        rank: In([1, 2, 3]),
      },
    });
    const topAwardIds = topAwards.map((a) => a.awardId);

    // Lấy paintings của Round 2 đủ điều kiện
    // Điều kiện: roundId thuộc các bảng Round 2 (A, B, C, D,...) và chưa có giải top 3
    let paintingsQuery = this.paintingsRepository
      .createQueryBuilder('painting')
      .where('painting.contest_id = :contestId', { contestId })
      .andWhere('painting.round_id IN (:...round2Ids)', { round2Ids });

    if (topAwardIds.length > 0) {
      paintingsQuery = paintingsQuery.andWhere(
        '(painting.award_id IS NULL OR painting.award_id NOT IN (:...topAwardIds))',
        { topAwardIds },
      );
    } else {
      paintingsQuery = paintingsQuery.andWhere('painting.award_id IS NULL');
    }

    const eligiblePaintings = await paintingsQuery
      .orderBy('painting.created_at', 'DESC')
      .getMany();

    // 6. Lấy thông tin vote cho giải này
    const paintingsWithVotes = await Promise.all(
      eligiblePaintings.map(async (painting) => {
        const voteCount = await this.votesRepository.count({
          where: {
            paintingId: painting.paintingId,
            contestId,
            awardId,
          },
        });

        let hasVoted = false;
        if (accountId) {
          const userVote = await this.votesRepository.findOne({
            where: {
              accountId,
              paintingId: painting.paintingId,
              contestId,
              awardId,
            },
          });
          hasVoted = !!userVote;
        }

        let competitorName;
        let email;
        if (painting.competitorId) {
          const competitor = await this.usersRepository.findOne({
            where: { userId: painting.competitorId },
          });
          competitorName = competitor?.fullName || null;
          email = competitor?.email || null;
        }

        const detailedScores = await this.calculateDetailedAverageScores(
          painting.paintingId,
        );

        return {
          paintingId: painting.paintingId,
          title: painting.title,
          description: painting.description,
          imageUrl: painting.imageUrl,
          competitorId: painting.competitorId,
          competitorName,
          email,
          avgScoreRound2: detailedScores.avgScoreRound2,
          avgCreativityScore: detailedScores.avgCreativityScore,
          avgCompositionScore: detailedScores.avgCompositionScore,
          avgColorScore: detailedScores.avgColorScore,
          avgTechnicalScore: detailedScores.avgTechnicalScore,
          avgAestheticScore: detailedScores.avgAestheticScore,
          evaluationCount: detailedScores.evaluationCount,
          submissionDate: painting.submissionDate,
          voteCount,
          hasVoted,
        };
      }),
    );

    paintingsWithVotes.sort((a, b) => b.voteCount - a.voteCount);

    return {
      success: true,
      data: {
        award: {
          awardId: award.awardId,
          name: award.name,
          description: award.description,
          rank: award.rank,
          prize: award.prize,
          quantity: award.quantity,
        },
        paintings: paintingsWithVotes,
        statistics: {
          totalEligiblePaintings: paintingsWithVotes.length,
          totalVotesForThisAward: paintingsWithVotes.reduce(
            (sum, p) => sum + p.voteCount,
            0,
          ),
        },
      },
    };
  }

  /**
   * Vote cho một painting Round 2 trong một giải cụ thể
   */
  async voteForAward(
    accountId: string,
    paintingId: string,
    awardId: number,
    contestId: number,
  ) {
    const painting = await this.paintingsRepository.findOne({
      where: { paintingId },
    });
    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    if (painting.contestId !== contestId) {
      throw new BadRequestException('Painting does not belong to this contest');
    }

    const round2Rounds = await this.roundsRepository.find({
      where: { contestId },
    });

    const round2Tables = round2Rounds.filter(
      (round) =>
        round.name &&
        (round.name.toUpperCase().includes('ROUND_2') ||
          round.name.toUpperCase().includes('ROUND 2')),
    );

    if (round2Tables.length === 0) {
      throw new BadRequestException('Round 2 not found for this contest');
    }

    const round2Ids = round2Tables.map((r) => r.roundId);

    if (!painting.roundId || !round2Ids.includes(painting.roundId)) {
      throw new BadRequestException(
        'This painting is not from Round 2 and cannot be voted for',
      );
    }

    const award = await this.awardsRepository.findOne({
      where: { awardId, contestId },
    });
    if (!award) {
      throw new NotFoundException(
        `Award with ID ${awardId} not found in this contest`,
      );
    }

    if ([1, 2, 3].includes(award.rank)) {
      throw new BadRequestException('Cannot vote for top 3 awards');
    }

    if (painting.awardId) {
      const paintingAward = await this.awardsRepository.findOne({
        where: { awardId: painting.awardId },
      });
      if (paintingAward && [1, 2, 3].includes(paintingAward.rank)) {
        throw new BadRequestException(
          'This painting already won a top 3 award and cannot be voted for',
        );
      }
    }

    const existingVote = await this.votesRepository.findOne({
      where: {
        accountId,
        awardId,
        contestId,
      },
    });

    if (existingVote) {
      throw new ConflictException(
        'You have already voted for this painting in this award category',
      );
    }

    const vote = this.votesRepository.create({
      accountId,
      paintingId,
      awardId,
      contestId,
    });
    const savedVote = await this.votesRepository.save(vote);

    const currentVoteCount = await this.votesRepository.count({
      where: {
        paintingId,
        awardId,
        contestId,
      },
    });

    return {
      success: true,
      message: 'Vote submitted successfully',
      data: {
        voteId: savedVote.voteId,
        painting: {
          paintingId: painting.paintingId,
          title: painting.title,
        },
        award: {
          awardId: award.awardId,
          name: award.name,
        },
        currentVoteCount,
      },
    };
  }

  /**
   * Xóa vote của user cho một painting trong một giải
   */
  async removeVoteForAward(
    accountId: string,
    paintingId: string,
    awardId: number,
    contestId: number,
  ) {
    const vote = await this.votesRepository.findOne({
      where: {
        accountId,
        paintingId,
        awardId,
        contestId,
      },
    });

    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    await this.votesRepository.delete(vote.voteId);

    return {
      success: true,
      message: 'Vote removed successfully',
    };
  }
}
