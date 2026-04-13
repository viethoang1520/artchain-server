import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote } from './entities/vote.entity';
import { CreateVoteDto } from './dto/create-vote.dto';
import { PaintingsService } from '../paintings/paintings.service';
import { ContestsQueryService } from '../contests/contests-query.service';
import { AwardsService } from '../awards/awards.service';
import { CompetitorsService } from '../competitors/competitor.service';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private readonly votesRepository: Repository<Vote>,
    private readonly paintingsService: PaintingsService,
    private readonly contestsQueryService: ContestsQueryService,
    private readonly awardsService: AwardsService,
    private readonly competitorsService: CompetitorsService,
  ) {}

  async getVotableAwards(contestId: number) {
    const contest = await this.contestsQueryService.findContestById(contestId);
    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const awards = await this.awardsService.listByContestExcludingRanks(
      contestId,
      [1, 2, 3],
    );

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
    const contest = await this.contestsQueryService.findContestById(contestId);
    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const award = await this.awardsService.findByIdAndContest(
      awardId,
      contestId,
    );
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

    const round2Rounds =
      await this.contestsQueryService.findAllRoundsByContest(contestId);

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

    const round2Ids = round2Tables.map((r) => r.roundId);

    const topAwards = await this.awardsService.listByContestWithRanks(
      contestId,
      [1, 2, 3],
    );
    const topAwardIds = topAwards.map((a) => a.awardId);

    const eligiblePaintings =
      await this.paintingsService.listEligibleRoundPaintingsForVoting(
        contestId,
        round2Ids,
        topAwardIds,
      );

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
          const { user } = await this.competitorsService.getCompetitorWithUser(
            painting.competitorId,
          );
          competitorName = user?.fullName || null;
          email = user?.email || null;
        }

        const detailedScores =
          await this.paintingsService.getDetailedAverageScoresForPainting(
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
    const painting = await this.paintingsService.findPaintingById(paintingId);
    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    if (painting.contestId !== contestId) {
      throw new BadRequestException('Painting does not belong to this contest');
    }

    const round2Rounds =
      await this.contestsQueryService.findAllRoundsByContest(contestId);

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

    const award = await this.awardsService.findByIdAndContest(
      awardId,
      contestId,
    );
    if (!award) {
      throw new NotFoundException(
        `Award with ID ${awardId} not found in this contest`,
      );
    }

    if ([1, 2, 3].includes(award.rank)) {
      throw new BadRequestException('Cannot vote for top 3 awards');
    }

    if (painting.awardId) {
      const paintingAward = await this.awardsService.findById(painting.awardId);
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
