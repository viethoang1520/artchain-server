import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UploadedFile,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, EntityManager, Not } from 'typeorm';
import { Painting } from './entities/paintings.entity';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluatePaintingDto } from './dto/evaluate-painting.dto';
import { PreliminaryEvaluationDto } from './dto/preliminary-evaluation.dto';
import { EvaluateRound2Dto } from './dto/evaluate-round2.dto';
import { Round } from '../contests/entities/round.entity';
import {
  PreliminaryReviewDto,
  PaintingReviewItem,
} from './dto/preliminary-review.dto';
import { AiService } from '../ai/ai.service';
import { GetAllSubmissionsDto } from './dto/get-all-submissions.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { CompetitorsService } from '../competitors/competitor.service';
import { ExaminersService } from '../examiners/examiners.service';
import { AwardsService } from '../awards/awards.service';
import { ContestsQueryService } from '../contests/contests-query.service';

@Injectable()
export class PaintingsService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly aiService: AiService,
    private readonly competitorsService: CompetitorsService,
    private readonly examinersService: ExaminersService,
    @Inject(forwardRef(() => AwardsService))
    private readonly awardsService: AwardsService,
    private readonly contestsQueryService: ContestsQueryService,
    @InjectRepository(Painting)
    private readonly paintingRepository: Repository<Painting>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
  ) {}

  async getAllSubmissionsByStaff(queryDto: GetAllSubmissionsDto) {
    const { page = 1, limit = 10, contestId, roundId, status } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.paintingRepository.createQueryBuilder('painting');

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

    const paintingsWithCompetitor = await Promise.all(
      paintings.map(async (painting) => {
        let competitorInfo: any = null;
        if (painting.competitorId) {
          const { user } = await this.competitorsService.getCompetitorWithUser(
            painting.competitorId,
          );

          if (user) {
            competitorInfo = {
              competitorId: user.userId,
              fullName: user.fullName || null,
              email: user.email || null,
              phone: user.phone || null,
              username: user.username || null,
            };
          }
        }

        return {
          ...painting,
          competitor: competitorInfo,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      success: true,
      data: paintingsWithCompetitor,
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

  async getSubmissionByStaff(paintingId: string) {
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Submission with ID ${paintingId} not found`);
    }

    let competitorInfo;
    if (painting.competitorId) {
      const { user } = await this.competitorsService.getCompetitorWithUser(
        painting.competitorId,
      );

      if (user) {
        competitorInfo = {
          competitorId: user.userId,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          username: user.username,
        };
      }
    }

    return {
      success: true,
      data: {
        ...painting,
        competitor: competitorInfo,
      },
    };
  }

  async reviewSubmissionByStaff(
    paintingId: string,
    reviewDto: ReviewSubmissionDto,
  ) {
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Submission with ID ${paintingId} not found`);
    }

    painting.status = reviewDto.status;

    const updatedPainting = await this.paintingRepository.save(painting);

    return {
      success: true,
      message: `Submission ${reviewDto.status.toLowerCase()} successfully`,
      data: {
        ...updatedPainting,
      },
    };
  }

  async acceptMultipleSubmissionsByStaff(paintingIds: string[]) {
    const results: {
      successful: Array<{ paintingId: string; status: string }>;
      failed: Array<{ paintingId: string; error: string }>;
    } = {
      successful: [],
      failed: [],
    };

    for (const paintingId of paintingIds) {
      try {
        await this.reviewSubmissionByStaff(paintingId, { status: 'ACCEPTED' });
        results.successful.push({
          paintingId,
          status: 'ACCEPTED',
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred';
        results.failed.push({
          paintingId,
          error: message,
        });
      }
    }

    const successCount = results.successful.length;
    const failureCount = results.failed.length;
    const total = paintingIds.length;

    return {
      success: true,
      message: `Processed ${total} submissions: ${successCount} accepted, ${failureCount} failed`,
      data: results,
      meta: {
        total,
        successCount,
        failureCount,
      },
    };
  }

  async listWinnerPaintingsByContest(contestId: number) {
    return this.paintingRepository.find({
      where: { contestId },
      relations: ['award'],
    });
  }

  async countQualifiedByRound(roundId: number) {
    return this.paintingRepository.count({
      where: {
        roundId,
        status: In([
          'PENDING',
          'ACCEPTED',
          'ORIGINAL_SUBMITTED',
          'NOT_SUBMITTED_ORIGINAL',
          'IN_AUCTION',
          'SOLD',
          'RE_OPEN',
        ]),
      },
    });
  }

  async listByRoundId(roundId: number) {
    return this.paintingRepository.find({
      where: { roundId },
    });
  }

  async softDeleteExaminerEvaluationsInContest(
    contestId: number,
    examinerId: string,
  ) {
    const evaluatedEvaluationIds = await this.evaluationRepository
      .createQueryBuilder('evaluation')
      .innerJoin(
        Painting,
        'painting',
        'painting.painting_id = evaluation.painting_id',
      )
      .select('evaluation.id', 'evaluationId')
      .where('evaluation.examiner_id = :examinerId', { examinerId })
      .andWhere('evaluation.status = :evaluationStatus', {
        evaluationStatus: 'COMPLETED',
      })
      .andWhere('painting.contest_id = :contestId', { contestId })
      .getRawMany<{ evaluationId: string }>();

    const evaluationIds = evaluatedEvaluationIds.map(
      (item) => item.evaluationId,
    );

    if (evaluationIds.length === 0) {
      return {
        affected: 0,
      };
    }

    await this.evaluationRepository.update(
      { id: In(evaluationIds) },
      { status: 'DELETED' },
    );

    return {
      affected: evaluationIds.length,
    };
  }

  async listByAwardAndContest(awardId: number, contestId: number) {
    return this.paintingRepository.find({
      where: { awardId, contestId },
    });
  }

  async countPaintings(where?: any) {
    if (!where) {
      return this.paintingRepository.count();
    }

    return this.paintingRepository.count({ where });
  }

  async findPaintings(where?: any) {
    if (!where) {
      return this.paintingRepository.find();
    }

    return this.paintingRepository.find({ where });
  }

  async findPaintingsByIds(paintingIds: string[]) {
    if (paintingIds.length === 0) {
      return [];
    }

    return this.paintingRepository.find({
      where: { paintingId: In(paintingIds) },
    });
  }

  async findByContestIds(contestIds: number[]) {
    if (contestIds.length === 0) {
      return [];
    }

    return this.paintingRepository.find({
      where: {
        contestId: In(contestIds),
      },
    });
  }

  async findAwardedPaintingsWithAward() {
    return this.paintingRepository.find({
      where: { awardId: Not(IsNull()) },
      relations: ['award'],
    });
  }

  async findAcceptedPaintings() {
    return this.paintingRepository.find({
      where: { status: 'ACCEPTED' },
    });
  }

  async countEvaluations() {
    return this.evaluationRepository.count();
  }

  async countEvaluationsByExaminerAndRound(
    examinerId: string,
    roundId: number,
  ) {
    return this.evaluationRepository
      .createQueryBuilder('evaluation')
      .innerJoin(
        Painting,
        'painting',
        'painting.painting_id = evaluation.painting_id',
      )
      .where('evaluation.examiner_id = :examinerId', { examinerId })
      .andWhere('painting.round_id = :roundId', { roundId })
      .andWhere('evaluation.score IS NOT NULL')
      .getCount();
  }

  async countPaintingsByRound(roundId: number) {
    return this.paintingRepository.count({
      where: { roundId },
    });
  }

  async countEvaluationsByPaintingIds(paintingIds: string[]) {
    if (paintingIds.length === 0) {
      return 0;
    }

    return this.evaluationRepository
      .createQueryBuilder('evaluation')
      .where('evaluation.painting_id IN (:...paintingIds)', { paintingIds })
      .getCount();
  }

  async findEvaluations() {
    return this.evaluationRepository.find();
  }

  async findPaintingById(paintingId: string) {
    return this.paintingRepository.findOne({
      where: { paintingId },
    });
  }

  async markPaintingMinted(paintingId: string, transactionHash: string) {
    await this.paintingRepository.query(
      'UPDATE paintings SET nft = $1 WHERE painting_id = $2',
      [transactionHash, paintingId],
    );

    return this.findPaintingById(paintingId);
  }

  async markPaintingInAuction(
    paintingId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager
      ? manager.getRepository(Painting)
      : this.paintingRepository;

    await repository.update({ paintingId }, { status: 'IN_AUCTION' });
  }

  async markPaintingSoldToOwner(
    paintingId: string,
    ownerId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager
      ? manager.getRepository(Painting)
      : this.paintingRepository;

    await repository.update({ paintingId }, { ownerId, status: 'SOLD' });
  }

  async markPaintingReOpen(
    paintingId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager
      ? manager.getRepository(Painting)
      : this.paintingRepository;

    await repository.update({ paintingId }, { status: 'RE_OPEN' });
  }

  async markPaintingsReOpen(
    paintingIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    if (paintingIds.length === 0) {
      return;
    }

    const repository = manager
      ? manager.getRepository(Painting)
      : this.paintingRepository;

    await repository.update(
      {
        paintingId: In(paintingIds),
      },
      { status: 'RE_OPEN' },
    );
  }

  async listEligibleRoundPaintingsForVoting(
    contestId: number,
    roundIds: Array<number | string>,
    excludedAwardIds: number[],
  ) {
    let paintingsQuery = this.paintingRepository
      .createQueryBuilder('painting')
      .where('painting.contest_id = :contestId', { contestId })
      .andWhere('painting.round_id IN (:...roundIds)', { roundIds });

    if (excludedAwardIds.length > 0) {
      paintingsQuery = paintingsQuery.andWhere(
        '(painting.award_id IS NULL OR painting.award_id NOT IN (:...excludedAwardIds))',
        { excludedAwardIds },
      );
    } else {
      paintingsQuery = paintingsQuery.andWhere('painting.award_id IS NULL');
    }

    return paintingsQuery.orderBy('painting.created_at', 'DESC').getMany();
  }

  async getDetailedAverageScoresForPainting(paintingId: string): Promise<{
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

  async calculateAverageScoreFromEvaluations(
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

  async hasSubmissionInRound(
    competitorId: string,
    contestId: number,
    roundId: number,
  ) {
    const painting = await this.paintingRepository.findOne({
      where: {
        competitorId,
        contestId,
        roundId,
      },
    });

    return !!painting;
  }

  async assignAwardToPaintingByStaff(paintingId: string, awardId: number) {
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
      relations: ['award'],
    });

    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    if (painting.awardId) {
      throw new BadRequestException(
        `Painting already has an award assigned (Award ID: ${painting.awardId})`,
      );
    }

    const award = await this.awardsService.findByIdWithPaintings(awardId);

    if (!award) {
      throw new NotFoundException(`Award with ID ${awardId} not found`);
    }

    if (award.quantity) {
      const paintingsWithAward = await this.paintingRepository.count({
        where: { awardId },
      });

      if (paintingsWithAward >= award.quantity) {
        throw new BadRequestException(
          `Award "${award.name}" has reached its maximum quantity (${award.quantity}). Cannot assign more paintings.`,
        );
      }
    }

    painting.awardId = awardId;
    const updatedPainting = await this.paintingRepository.save(painting);

    const currentCount = await this.paintingRepository.count({
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

  async unassignAwardFromPaintingByStaff(paintingId: string) {
    const painting = await this.paintingRepository.findOne({
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
    await this.paintingRepository.save(painting);

    return {
      success: true,
      message: 'Award unassigned from painting successfully',
      data: {
        paintingId: painting.paintingId,
        previousAwardId,
      },
    };
  }

  async uploadRound2PaintingImageByStaff(
    paintingId: string,
    imageFile?: Express.Multer.File,
    title?: string,
    description?: string,
  ) {
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    const round = await this.contestsQueryService.findRoundById(
      painting.roundId,
    );

    if (!round || round.name !== 'ROUND_2') {
      throw new BadRequestException(
        'This painting is not in ROUND_2. Can only update ROUND_2 paintings.',
      );
    }

    if (!imageFile && !title && !description) {
      throw new BadRequestException(
        'At least one field (image, title, or description) must be provided',
      );
    }

    let imageUrl = painting.imageUrl;

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
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred';
        throw new BadRequestException(`Failed to upload image: ${message}`);
      }
    }

    if (title) {
      painting.title = title;
    }
    if (description) {
      painting.description = description;
    }

    await this.paintingRepository.save(painting);

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

  private async calculateCompetitorScoresByContest(
    passedPaintings: Painting[],
    contestId: number,
  ) {
    const uniqueCompetitorIds = [
      ...new Set(passedPaintings.map((p) => p.competitorId)),
    ];

    const competitorScores = await Promise.all(
      uniqueCompetitorIds.map(async (competitorId) => {
        const competitorPaintings = passedPaintings.filter(
          (p) => p.competitorId === competitorId && p.contestId === contestId,
        );

        const paintingIds = competitorPaintings.map((p) => p.paintingId);
        const evaluations = await this.evaluationRepository.find({
          where: paintingIds.map((paintingId) => ({
            paintingId,
            status: 'COMPLETED',
          })),
        });

        let avgScore = 0;
        if (evaluations.length > 0) {
          const totalScore = evaluations.reduce(
            (sum, evaluation) => sum + (evaluation.scoreRound1 || 0),
            0,
          );
          avgScore = totalScore / evaluations.length;
        }
        // console.log("passed paintings: ", passedPaintings)

        return {
          competitorId,
          avgScore,
          evaluationCount: evaluations.length,
        };
      }),
    );

    competitorScores.sort((a, b) => b.avgScore - a.avgScore);

    return competitorScores;
  }

  async getRound2QualifiedPaintingsByStaff(contestId: number) {
    const contest = await this.contestsQueryService.findContestById(contestId);

    if (!contest) {
      throw new NotFoundException(`Không tìm thấy cuộc thi ${contestId}`);
    }

    if (!contest.round2Quantity) {
      throw new BadRequestException(
        'This contest does not have round_2_quantity configured',
      );
    }

    const round1 = await this.contestsQueryService.findRoundByContestAndName(
      contestId,
      'ROUND_1',
    );

    if (!round1) {
      throw new NotFoundException('ROUND_1 not found for this contest');
    }

    const paintings = await this.paintingRepository.find({
      where: {
        contestId,
        roundId: round1.roundId,
        status: In(['ACCEPTED', 'ORIGINAL_SUBMITTED']),
      },
    });

    const competitorScores = await this.calculateCompetitorScoresByContest(
      paintings,
      contestId,
    );

    const competitorsWithDetails = await Promise.all(
      competitorScores.map(async (compScore) => {
        const { user } = await this.competitorsService.getCompetitorWithUser(
          compScore.competitorId,
        );

        const competitorPaintings = paintings.filter(
          (p) => p.competitorId === compScore.competitorId,
        );
        console.log('competitorPaintings: ', competitorPaintings);
        const paintingsWithScores = await Promise.all(
          competitorPaintings.map(async (painting) => {
            const evaluations = await this.evaluationRepository.find({
              where: { paintingId: painting.paintingId, status: 'COMPLETED' },
            });
            console.log('painting: ', evaluations);

            if (evaluations.length === 0) return null;

            const totalScore = evaluations.reduce((sum, evaluation) => {
              return sum + (evaluation.scoreRound1 || 0);
            }, 0);

            const avgScore = totalScore / evaluations.length;

            return {
              paintingId: painting.paintingId,
              title: painting.title,
              imageUrl: painting.imageUrl,
              status: painting.status,
              avgScore: Number(avgScore.toFixed(2)),
              submissionDate: painting.submissionDate,
            };
          }),
        );
        console.log('paintingsWithScores: ', paintingsWithScores);

        const validPaintings = paintingsWithScores.filter((p) => p !== null);
        const bestPainting = validPaintings.sort((a, b) => {
          if (b.avgScore !== a.avgScore) {
            return b.avgScore - a.avgScore;
          }
          const dateA = a.submissionDate
            ? new Date(a.submissionDate).getTime()
            : Infinity;
          const dateB = b.submissionDate
            ? new Date(b.submissionDate).getTime()
            : Infinity;
          return dateA - dateB;
        })[0];

        const hasSubmittedOriginal = competitorPaintings.some(
          (p) => p.status === 'ORIGINAL_SUBMITTED',
        );

        return {
          competitorId: compScore.competitorId,
          competitorName: user?.fullName || 'Unknown',
          competitorEmail: user?.email || null,
          avgScore: Number(compScore.avgScore.toFixed(2)),
          evaluationCount: compScore.evaluationCount,
          painting: bestPainting || null,
          status: hasSubmittedOriginal
            ? 'ORIGINAL_SUBMITTED'
            : competitorPaintings[0]?.status || 'ACCEPTED',
          hasSubmittedOriginal,
        };
      }),
    );

    const qualifiedCompetitors = competitorsWithDetails.slice(
      0,
      contest.round2Quantity,
    );

    const notSubmittedCount = qualifiedCompetitors.filter(
      (c) => !c.hasSubmittedOriginal,
    ).length;

    return {
      success: true,
      message: 'Qualified list shows top competitors who passed ROUND_1.',
      data: {
        contestId,
        contestTitle: contest.title,
        round2Quantity: contest.round2Quantity,
        qualified: qualifiedCompetitors,
        summary: {
          totalQualified: qualifiedCompetitors.length,
          submitted: qualifiedCompetitors.filter((c) => c.hasSubmittedOriginal)
            .length,
          notSubmitted: notSubmittedCount,
        },
      },
    };
  }

  async updateOriginalSubmissionStatusByStaff(
    contestId: number,
    paintingId: string,
    hasSubmittedOriginal: boolean,
  ) {
    const contest = await this.contestsQueryService.findContestById(contestId);

    if (!contest) {
      throw new NotFoundException(`Không tìm thấy cuộc thi ${contestId}`);
    }

    const painting = await this.paintingRepository.findOne({
      where: { paintingId, contestId },
    });

    if (!painting) {
      throw new NotFoundException(
        `Không tìm thấy tranh có ID ${paintingId} trong cuộc thi ${contestId}`,
      );
    }

    painting.status = hasSubmittedOriginal
      ? 'ORIGINAL_SUBMITTED'
      : 'NOT_SUBMITTED_ORIGINAL';
    await this.paintingRepository.save(painting);

    return {
      success: true,
      message: hasSubmittedOriginal
        ? 'Original submission status updated successfully'
        : 'Painting marked as not submitted original',
      data: {
        paintingId,
        status: painting.status,
        hasSubmittedOriginal,
      },
    };
  }

  async createRound2WithTablesByStaff(
    contestId: number,
    date: string,
    numberOfTables?: number,
  ) {
    const contest = await this.contestsQueryService.findContestById(contestId);

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    if (!date) {
      throw new BadRequestException('Date is required for ROUND_2');
    }

    const tablesToCreate = numberOfTables || contest.numberOfTablesRound2 || 4;

    if (tablesToCreate < 3 || tablesToCreate > 6) {
      throw new BadRequestException(
        'Number of tables must be between 3 and 6 (A-Z)',
      );
    }

    const round2Date = new Date(date);
    if (isNaN(round2Date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const existingRound2 =
      await this.contestsQueryService.findRoundByContestAndName(
        contestId,
        'ROUND_2',
      );

    if (existingRound2) {
      throw new BadRequestException(
        `ROUND_2 has already been created for contest ${contestId}. Cannot create duplicate ROUND_2.`,
      );
    }

    const qualifiedData =
      await this.getRound2QualifiedPaintingsByStaff(contestId);

    const qualifiedCompetitors = qualifiedData.data.qualified.filter(
      (p) => p.status === 'ORIGINAL_SUBMITTED',
    );

    if (qualifiedCompetitors.length === 0) {
      throw new BadRequestException(
        'No competitors have submitted original paintings yet. Cannot create ROUND_2.',
      );
    }

    if (qualifiedCompetitors.length < tablesToCreate) {
      throw new BadRequestException(
        `Need at least ${tablesToCreate} competitors who submitted originals to create ${tablesToCreate} tables. Only ${qualifiedCompetitors.length} competitors submitted originals.`,
      );
    }

    const topCompetitors = qualifiedCompetitors.map((p) => ({
      competitorId: p.competitorId,
      avgScore: p.avgScore,
      evaluationCount: 1,
    }));

    const tableNames: string[] = [];
    for (let i = 0; i < tablesToCreate; i++) {
      tableNames.push(String.fromCharCode(65 + i));
    }

    const tables: string[][] = Array(tablesToCreate)
      .fill(null)
      .map(() => []);

    for (let i = 0; i < topCompetitors.length; i++) {
      const group = Math.floor(i / tablesToCreate);
      const positionInGroup = i % tablesToCreate;

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
      const savedRound = await this.contestsQueryService.createRound({
        contestId,
        name: 'ROUND_2',
        table: tableNames[i],
        startDate: round2Date,
        endDate: round2Date,
        status: 'DRAFT',
      });
      createdRounds.push(savedRound);

      for (const competitorId of tables[i]) {
        const { user } =
          await this.competitorsService.getCompetitorWithUser(competitorId);
        const competitorName = user?.fullName || competitorId;

        const painting = this.paintingRepository.create({
          competitorId,
          contestId,
          roundId: savedRound.roundId,
          title: `Bảng ${tableNames[i]} - ${competitorName}`,
          description: `Tranh vòng chung khảo, Bảng ${tableNames[i]}.`,
          status: 'ACCEPTED',
        });

        const savedPainting = await this.paintingRepository.save(painting);
        createdPaintings.push(savedPainting);
      }
    }

    const paintingsByTable: { [key: string]: Painting[] } = {};
    const tableDistribution: any = {};

    for (let i = 0; i < tablesToCreate; i++) {
      const tableName = `Table ${tableNames[i]}`;
      paintingsByTable[tableName] = createdPaintings.filter(
        (p) => p.roundId === createdRounds[i].roundId,
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
        qualifiedWithOriginals: qualifiedCompetitors.length,
        totalPaintingsCreated: createdPaintings.length,
      },
    };
  }

  async getPaintingsByContestId(
    contestId: number,
    roundName?: string,
    status?: string,
    examinerId?: string,
  ) {
    const normalizedRoundName = roundName
      ? roundName.trim().toUpperCase().replace(/\s+/g, '_')
      : undefined;
    const normalizedExaminerId = examinerId?.trim() || undefined;

    const checkEvaluatedByExaminer = async (
      paintingId: string,
      examinerId: string,
    ) => {
      const evaluation = await this.evaluationRepository.findOne({
        where: { paintingId, examinerId, status: 'COMPLETED' },
      });
      return !!evaluation;
    };
    if (!contestId) {
      throw new NotFoundException('Contest ID is required');
    }

    let roundIds: string[] = [];
    if (normalizedRoundName) {
      if (normalizedRoundName === 'ROUND_2') {
        if (!normalizedExaminerId) {
          throw new BadRequestException(
            'examinerId is required for ROUND_2 to filter assigned table',
          );
        }

        let round2Tables =
          await this.contestsQueryService.findRoundsByContestAndName(
            contestId,
            'ROUND_2',
          );

        const assignedTable =
          await this.examinersService.getAssignedRound2TableByExaminerAndContest(
            normalizedExaminerId,
            contestId,
          );

        if (!assignedTable) {
          throw new BadRequestException(
            `Examiner ${normalizedExaminerId} has no ROUND_2 table assignment for contest ${contestId}`,
          );
        }

        round2Tables = round2Tables.filter(
          (round) => round.table?.toUpperCase() === assignedTable,
        );

        if (round2Tables.length > 0) {
          roundIds = round2Tables.map((r) => String(r.roundId));
        }
      } else {
        const round = await this.contestsQueryService.findRoundByContestAndName(
          contestId,
          normalizedRoundName,
        );

        if (round) {
          roundIds = [String(round.roundId)];
        }
      }
    }

    const whereCondition: any = { contestId };

    if (roundIds.length > 0) {
      if (roundIds.length === 1) {
        whereCondition.roundId = roundIds[0];
      } else {
        const paintingsPromises = roundIds.map((roundId) => {
          const condition = { ...whereCondition, roundId };

          if (status) {
            condition.status = status;
          }

          return this.paintingRepository.find({ where: condition });
        });

        const paintingsArrays = await Promise.all(paintingsPromises);
        let allPaintings = paintingsArrays.flat();

        if (normalizedExaminerId) {
          const unevaluatedPaintings = await Promise.all(
            allPaintings.map(async (painting) => {
              const hasEvaluated = await checkEvaluatedByExaminer(
                painting.paintingId,
                normalizedExaminerId,
              );
              return hasEvaluated ? null : painting;
            }),
          );
          allPaintings = unevaluatedPaintings.filter((p) => p !== null);
        }

        const paintingsWithCompetitor = await Promise.all(
          allPaintings.map(async (painting) => {
            const { competitor, user } =
              await this.competitorsService.getCompetitorWithUser(
                painting.competitorId,
              );

            return {
              ...painting,
              competitor: competitor
                ? {
                    competitorId: competitor.competitorId,
                    birthday: competitor.birthday,
                    schoolName: competitor.schoolName,
                    ward: competitor.ward,
                    grade: competitor.grade,
                    guardianId: competitor.guardianId,
                  }
                : null,
              user: user
                ? {
                    userId: user.userId,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    phone: user.phone,
                  }
                : null,
            };
          }),
        );

        return {
          paintings: paintingsWithCompetitor || [],
          count: paintingsWithCompetitor.length,
        };
      }
    }

    if (status) {
      whereCondition.status = status;
    }

    let paintings = await this.paintingRepository.find({
      where: whereCondition,
    });

    // Filter paintings that have NOT been evaluated by this examiner (if examinerId provided)
    if (normalizedExaminerId) {
      const unevaluatedPaintings = await Promise.all(
        paintings.map(async (painting) => {
          const hasEvaluated = await checkEvaluatedByExaminer(
            painting.paintingId,
            normalizedExaminerId,
          );
          return hasEvaluated ? null : painting;
        }),
      );
      paintings = unevaluatedPaintings.filter((p) => p !== null);
    }

    const paintingsWithCompetitor = await Promise.all(
      paintings.map(async (painting) => {
        const { competitor, user } =
          await this.competitorsService.getCompetitorWithUser(
            painting.competitorId,
          );

        return {
          ...painting,
          competitor: competitor
            ? {
                competitorId: competitor.competitorId,
                birthday: competitor.birthday,
                schoolName: competitor.schoolName,
                ward: competitor.ward,
                grade: competitor.grade,
                guardianId: competitor.guardianId,
              }
            : null,
          user: user
            ? {
                userId: user.userId,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
              }
            : null,
        };
      }),
    );

    return {
      paintings: paintingsWithCompetitor || [],
      count: paintingsWithCompetitor.length,
    };
  }

  async uploadFile(@UploadedFile() file: Express.Multer.File, data: any) {
    if (!file) throw new NotFoundException('No file uploaded!');
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const { ignoreAiCheck, competitorId, contestId, roundId } = parsedData;
    const contest = await this.contestsQueryService.findContestById(contestId);
    if (!contest) {
      throw new NotFoundException(
        `Không tìm thấy cuộc thi với ID ${contestId}`,
      );
    }
    const isFlagged =
      parsedData?.isFlagged === true || parsedData?.isFlagged === 'true';
    const shouldIgnoreAiCheckByRetry =
      ignoreAiCheck === true ||
      ignoreAiCheck === 'true' ||
      (typeof ignoreAiCheck === 'string' &&
        ignoreAiCheck.trim().toLowerCase() === 'retry');

    const shouldRunAiValidation =
      !contest?.ignoreAiCheck && !shouldIgnoreAiCheckByRetry;

    if (shouldRunAiValidation) {
      const validationResult = await this.aiService.checkValidSubmission(
        file.buffer.toString('base64'),
      );

      if (!validationResult || validationResult.valid !== true) {
        const reason = validationResult?.reason || 'Hình ảnh không hợp lệ.';
        throw new BadRequestException(`Ảnh không hợp lệ: ${reason}`);
      }
    }
    const existingSubmission = await this.paintingRepository.findOne({
      where: {
        competitorId,
        contestId,
        roundId,
      },
    });
    if (existingSubmission) {
      throw new BadRequestException('Bạn đã có một bài dự thi cho vòng này.');
    }

    const bucket = this.firebaseService.getStorage().bucket();
    const fileName = `uploads/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    const [url] = await fileUpload.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    const newPainting = await this.createPainting(parsedData, url);

    await this.paintingRepository.update(
      { paintingId: newPainting.paintingId },
      { isFlagged },
    );

    return newPainting;
  }

  async createPainting(data, url): Promise<Painting> {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const { competitorId, title, description, roundId, contestId } = parsedData;
    const newPainting = this.paintingRepository.create({
      competitorId,
      title,
      description,
      roundId,
      contestId,
      submissionDate: new Date(),
      imageUrl: url,
    });
    return await this.paintingRepository.save(newPainting);
  }

  async evaluatePainting(
    evaluateDto: EvaluatePaintingDto,
  ): Promise<{ canEvaluate: boolean; data?: Evaluation; message?: string }> {
    const { paintingId, examinerId, score, feedback } = evaluateDto;

    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });
    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    const contestExaminer = await this.examinersService.findActiveAssignment(
      painting.contestId,
      examinerId,
    );

    if (!contestExaminer) {
      throw new BadRequestException(
        `Examiner ${examinerId} is not assigned to contest ${painting.contestId} or is not active`,
      );
    }

    // Check schedule of examiner
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedule =
      await this.examinersService.findActiveScheduleByExaminerAndContest(
        examinerId,
        painting.contestId,
      );

    if (!schedule) {
      return {
        canEvaluate: false,
        message: 'Examiner does not have a schedule assigned for this contest',
      };
    }

    const scheduleDate = new Date(schedule.date);
    scheduleDate.setHours(0, 0, 0, 0);

    const round = await this.contestsQueryService.findRoundById(
      painting.roundId,
    );

    if (round?.name === 'ROUND_2') {
      const assignedTable =
        await this.examinersService.getAssignedRound2TableByExaminerAndContest(
          examinerId,
          painting.contestId,
        );

      if (!assignedTable) {
        return {
          canEvaluate: false,
          message:
            'Examiner does not have a ROUND_2 table assignment for this contest',
        };
      }

      const paintingTable = round.table?.trim().toUpperCase();
      if (paintingTable !== assignedTable) {
        return {
          canEvaluate: false,
          message: `Examiner is assigned to table ${assignedTable} and cannot evaluate table ${paintingTable || 'UNKNOWN'}`,
        };
      }
    }

    // Check if schedule enforcement is enabled for this contest
    const contest = await this.contestsQueryService.findContestById(
      painting.contestId,
    );

    if (
      contest?.isScheduleEnforced &&
      scheduleDate.getTime() !== today.getTime()
    ) {
      return {
        canEvaluate: false,
        message: `You can only evaluate on your scheduled date: ${scheduleDate.toISOString().split('T')[0]}`,
      };
    }

    const existingEvaluation = await this.evaluationRepository.findOne({
      where: { paintingId, examinerId },
    });

    if (existingEvaluation) {
      existingEvaluation.scoreRound1 = score;
      existingEvaluation.feedback = feedback || '';
      existingEvaluation.evaluationDate = new Date();
      existingEvaluation.status = 'COMPLETED';

      const savedEvaluation =
        await this.evaluationRepository.save(existingEvaluation);
      return {
        canEvaluate: true,
        data: savedEvaluation,
        message: 'Evaluation updated successfully',
      };
    }

    const newEvaluation = this.evaluationRepository.create({
      paintingId,
      examinerId,
      scoreRound1: score,
      feedback: feedback || '',
      evaluationDate: new Date(),
      status: 'COMPLETED',
    });

    const savedEvaluation = await this.evaluationRepository.save(newEvaluation);
    return {
      canEvaluate: true,
      data: savedEvaluation,
      message: 'Evaluation created successfully',
    };
  }

  async evaluateRound2Painting(
    evaluateDto: EvaluateRound2Dto,
  ): Promise<{ canEvaluate: boolean; data?: Evaluation; message?: string }> {
    const {
      paintingId,
      examinerId,
      creativityScore,
      compositionScore,
      colorScore,
      technicalScore,
      aestheticScore,
      feedback,
    } = evaluateDto;

    // Validate painting exists
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    const round = await this.contestsQueryService.findRoundById(
      painting.roundId,
    );

    if (!round || round.name !== 'ROUND_2') {
      throw new BadRequestException(
        'This evaluation method is only for ROUND_2 paintings',
      );
    }

    const contestExaminer = await this.examinersService.findActiveAssignment(
      painting.contestId,
      examinerId,
    );

    if (!contestExaminer) {
      throw new BadRequestException(
        `Examiner ${examinerId} is not assigned to contest ${painting.contestId} or is not active`,
      );
    }

    // Kiểm tra lịch chấm bài của examiner
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate date comparison

    const schedule =
      await this.examinersService.findActiveScheduleByExaminerAndContest(
        examinerId,
        painting.contestId,
      );

    if (!schedule) {
      return {
        canEvaluate: false,
        message: 'Examiner does not have a schedule assigned for this contest',
      };
    }

    const scheduleDate = new Date(schedule.date);
    scheduleDate.setHours(0, 0, 0, 0);

    const assignedTable =
      await this.examinersService.getAssignedRound2TableByExaminerAndContest(
        examinerId,
        painting.contestId,
      );

    if (!assignedTable) {
      return {
        canEvaluate: false,
        message:
          'Examiner does not have a ROUND_2 table assignment for this contest',
      };
    }

    const paintingTable = round.table?.toUpperCase();
    if (paintingTable !== assignedTable) {
      return {
        canEvaluate: false,
        message: `Examiner is assigned to table ${assignedTable} and cannot evaluate table ${paintingTable || 'UNKNOWN'}`,
      };
    }

    // Check if schedule enforcement is enabled for this contest
    const contest = await this.contestsQueryService.findContestById(
      painting.contestId,
    );

    if (
      contest?.isScheduleEnforced &&
      scheduleDate.getTime() !== today.getTime()
    ) {
      return {
        canEvaluate: false,
        message: `You can only evaluate on your scheduled date: ${scheduleDate.toISOString().split('T')[0]}`,
      };
    }

    const totalScore =
      creativityScore +
      compositionScore +
      colorScore +
      technicalScore +
      aestheticScore;

    const existingEvaluation = await this.evaluationRepository.findOne({
      where: { paintingId, examinerId },
    });

    if (existingEvaluation) {
      existingEvaluation.creativityScore = creativityScore;
      existingEvaluation.compositionScore = compositionScore;
      existingEvaluation.colorScore = colorScore;
      existingEvaluation.technicalScore = technicalScore;
      existingEvaluation.aestheticScore = aestheticScore;
      existingEvaluation.scoreRound2 = totalScore;
      existingEvaluation.feedback = feedback || '';
      existingEvaluation.evaluationDate = new Date();
      existingEvaluation.status = 'COMPLETED';

      const updatedEvaluation =
        await this.evaluationRepository.save(existingEvaluation);

      return {
        canEvaluate: true,
        data: updatedEvaluation,
        message: 'Evaluation updated successfully',
      };
    }

    const newEvaluation = this.evaluationRepository.create({
      paintingId,
      examinerId,
      creativityScore,
      compositionScore,
      colorScore,
      technicalScore,
      aestheticScore,
      scoreRound2: totalScore,
      feedback: feedback || '',
      evaluationDate: new Date(),
      status: 'COMPLETED',
    });

    const savedEvaluation = await this.evaluationRepository.save(newEvaluation);

    return {
      canEvaluate: true,
      data: savedEvaluation,
      message: 'Evaluation created successfully',
    };
  }

  async getPaintingDetail(paintingId: string): Promise<Painting> {
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
      relations: [
        'contest',
        'award',
        'competitor',
        'competitor.user',
        'competitor.guardian',
        'auctionPaintings.auction',
        'nft',
      ],
    });

    if (!painting) {
      throw new NotFoundException(`Không tìm thấy tranh có ID ${paintingId}`);
    }

    return painting;
  }

  async getPaintingEvaluations(paintingId: string): Promise<any[]> {
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Không tìm thấy tranh có ID ${paintingId}`);
    }

    const evaluations = await this.evaluationRepository.find({
      where: { paintingId },
      relations: ['examiner'],
    });

    const evaluationsWithNames =
      await this.examinersService.enrichWithExaminerProfile(evaluations);

    return evaluationsWithNames;
  }

  async getRound2PaintingsWithAvgScore(contestId: number) {
    const rounds = await this.contestsQueryService.findRoundsByContestAndName(
      contestId,
      'ROUND_2',
    );

    if (rounds.length === 0) {
      throw new NotFoundException(`ROUND_2 not found for contest ${contestId}`);
    }

    const topPaintingsPerTable = await Promise.all(
      rounds.map(async (round) => {
        const paintings = await this.paintingRepository.find({
          where: {
            contestId: contestId,
            roundId: round.roundId,
          },
        });

        if (paintings.length === 0) {
          return null;
        }

        const paintingsWithAvgScore = await Promise.all(
          paintings.map(async (painting) => {
            const evaluations = await this.evaluationRepository.find({
              where: { paintingId: painting.paintingId },
            });

            let avgScoreRound2 = 0;
            let avgCreativityScore = 0;
            let avgCompositionScore = 0;
            let avgColorScore = 0;
            let avgTechnicalScore = 0;
            let avgAestheticScore = 0;
            let evaluationCount = 0;

            if (evaluations.length > 0) {
              const validScores = evaluations.filter(
                (e) => e.scoreRound2 !== null && e.scoreRound2 !== undefined,
              );

              if (validScores.length > 0) {
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
                avgScoreRound2 = totalScore / validScores.length;
                avgCreativityScore = totalCreativity / validScores.length;
                avgCompositionScore = totalComposition / validScores.length;
                avgColorScore = totalColor / validScores.length;
                avgTechnicalScore = totalTechnical / validScores.length;
                avgAestheticScore = totalAesthetic / validScores.length;
                evaluationCount = validScores.length;
              }
            }

            let competitorName = 'Unknown';
            const { user } =
              await this.competitorsService.getCompetitorWithUser(
                painting.competitorId,
              );
            if (user) {
              competitorName = user.fullName || 'Unknown';
            }

            // Get award information if painting has been awarded
            let awardInfo: any = null;
            if (painting.awardId) {
              const award = await this.awardsService.findById(painting.awardId);
              if (award) {
                awardInfo = {
                  awardId: award.awardId,
                  name: award.name,
                  description: award.description,
                  rank: award.rank,
                  prize: award.prize,
                };
              }
            }

            return {
              paintingId: painting.paintingId,
              title: painting.title,
              imageUrl: painting.imageUrl,
              competitorId: painting.competitorId,
              competitorName,
              avgScoreRound2: Math.round(avgScoreRound2 * 100) / 100,
              avgCreativityScore: Math.round(avgCreativityScore * 100) / 100,
              avgCompositionScore: Math.round(avgCompositionScore * 100) / 100,
              avgColorScore: Math.round(avgColorScore * 100) / 100,
              avgTechnicalScore: Math.round(avgTechnicalScore * 100) / 100,
              avgAestheticScore: Math.round(avgAestheticScore * 100) / 100,
              evaluationCount,
              status: painting.status,
              table: round.table || 'Unknown',
              roundId: round.roundId,
              award: awardInfo,
              createdAt: painting.createdAt,
            };
          }),
        );

        // Sắp xếp: Ưu tiên avgScoreRound2, nếu bằng nhau thì so sánh lần lượt các tiêu chí khác
        paintingsWithAvgScore.sort((a, b) => {
          if (b.avgScoreRound2 !== a.avgScoreRound2) {
            return b.avgScoreRound2 - a.avgScoreRound2;
          }
          if (b.avgCreativityScore !== a.avgCreativityScore) {
            return b.avgCreativityScore - a.avgCreativityScore;
          }
          if (b.avgCompositionScore !== a.avgCompositionScore) {
            return b.avgCompositionScore - a.avgCompositionScore;
          }
          if (b.avgColorScore !== a.avgColorScore) {
            return b.avgColorScore - a.avgColorScore;
          }
          if (b.avgTechnicalScore !== a.avgTechnicalScore) {
            return b.avgTechnicalScore - a.avgTechnicalScore;
          }
          return b.avgAestheticScore - a.avgAestheticScore;
        });

        return {
          table: round.table || 'Unknown',
          roundId: round.roundId,
          paintings: paintingsWithAvgScore,
          topPainting: paintingsWithAvgScore[0],
        };
      }),
    );

    const tableResults = topPaintingsPerTable.filter(
      (result) => result !== null,
    );

    tableResults.sort((a, b) => {
      if (b.topPainting.avgScoreRound2 !== a.topPainting.avgScoreRound2) {
        return b.topPainting.avgScoreRound2 - a.topPainting.avgScoreRound2;
      }
      return (
        b.topPainting.avgCreativityScore - a.topPainting.avgCreativityScore
      );
    });

    const totalPaintings = tableResults.reduce(
      (sum, table) => sum + table.paintings.length,
      0,
    );

    return {
      success: true,
      message: `Paintings from all ROUND_2 tables retrieved successfully`,
      data: tableResults,
      summary: {
        totalTables: tableResults.length,
        totalPaintings: totalPaintings,
      },
    };
  }
}
