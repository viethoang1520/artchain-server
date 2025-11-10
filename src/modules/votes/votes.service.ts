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
   * Lấy danh sách các giải có thể vote trong contest (không bao gồm giải 1, 2, 3)
   */
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

  /**
   * Lấy danh sách paintings Round 2 có thể vote cho một giải cụ thể
   *
   */
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

    // 2. lấy các award ngoài nhất nhì ba
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

    // Lọc các rounds có name chứa "ROUND_2"
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

    // Lấy tất cả roundIds của Round 2 (bảng A, B, C, D,...)
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
      .andWhere('painting.round_id IN (:...round2Ids)', { round2Ids }); // Lấy paintings của TẤT CẢ các bảng Round 2

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
        let email
        if (painting.competitorId) {
          const competitor = await this.usersRepository.findOne({
            where: { userId: painting.competitorId },
          });
          competitorName = competitor?.fullName || null;
          email = competitor?.email || null;
        }

        return {
          paintingId: painting.paintingId,
          title: painting.title,
          description: painting.description,
          imageUrl: painting.imageUrl,
          competitorId: painting.competitorId,
          competitorName,
          email,
          submissionDate: painting.submissionDate,
          voteCount,
          hasVoted,
        };
      }),
    );

    // Sort theo số votes giảm dần
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

    const round2Ids = round2Tables.map((r) => r.roundId.toString());

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
