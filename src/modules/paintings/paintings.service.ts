import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UploadedFile,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Painting } from './entities/paintings.entity';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluatePaintingDto } from './dto/evaluate-painting.dto';
import { PreliminaryEvaluationDto } from './dto/preliminary-evaluation.dto';
import { EvaluateRound2Dto } from './dto/evaluate-round2.dto';
import { User } from '../users/entities/user.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { Round } from '../contests/entities/round.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import {
  PreliminaryReviewDto,
  PaintingReviewItem,
} from './dto/preliminary-review.dto';
import { Award } from '../awards/entities/award.entity';

@Injectable()
export class PaintingsService {
  constructor(
    private readonly firebaseService: FirebaseService,
    @InjectRepository(Painting)
    private readonly paintingRepository: Repository<Painting>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ContestExaminer)
    private readonly contestExaminerRepository: Repository<ContestExaminer>,
    @InjectRepository(Round)
    private readonly roundRepository: Repository<Round>,
    @InjectRepository(Competitor)
    private readonly competitorRepository: Repository<Competitor>,
    @InjectRepository(Award)
    private readonly awardRepository: Repository<Award>,
  ) {}

  async getPaintingsByContestId(
    contestId: number,
    roundName?: string,
    // isPassed?: boolean | null,
    status?: string,
    examinerId?: string,
  ) {
    const checkEvaluatedByExaminer = async (
      paintingId: string,
      examinerId: string,
    ) => {
      const evaluation = await this.evaluationRepository.findOne({
        where: { paintingId, examinerId },
      });
      return !!evaluation;
    };
    if (!contestId) {
      throw new NotFoundException('Contest ID is required');
    }

    let roundIds: string[] = [];
    if (roundName) {
      if (roundName === 'ROUND_2') {
        const round2Tables = await this.roundRepository.find({
          where: {
            contestId: contestId,
            name: 'ROUND_2',
          },
        });

        if (round2Tables.length > 0) {
          roundIds = round2Tables
            .filter((r) => r.table && ['A', 'B', 'C', 'D'].includes(r.table))
            .map((r) => String(r.roundId));
        }
      } else {
        const round = await this.roundRepository.findOne({
          where: {
            contestId: contestId,
            name: roundName,
          },
        });

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

          // if (isPassed !== undefined) {
          //   if (isPassed === null) {
          //     condition.isPassed = IsNull();
          //   } else {
          //     condition.isPassed = isPassed;
          //   }
          // }

          if (status) {
            condition.status = status;
          }

          return this.paintingRepository.find({ where: condition });
        });

        const paintingsArrays = await Promise.all(paintingsPromises);
        let allPaintings = paintingsArrays.flat();

        if (examinerId) {
          const unevaluatedPaintings = await Promise.all(
            allPaintings.map(async (painting) => {
              const hasEvaluated = await checkEvaluatedByExaminer(
                painting.paintingId,
                examinerId,
              );
              return hasEvaluated ? null : painting;
            }),
          );
          allPaintings = unevaluatedPaintings.filter((p) => p !== null);
        }

        const paintingsWithCompetitor = await Promise.all(
          allPaintings.map(async (painting) => {
            const competitor = await this.competitorRepository.findOne({
              where: { competitorId: painting.competitorId },
            });

            const user = await this.userRepository.findOne({
              where: { userId: painting.competitorId },
            });

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

    // if (isPassed !== undefined) {
    //   if (isPassed === null) {
    //     whereCondition.isPassed = IsNull();
    //   } else {
    //     whereCondition.isPassed = isPassed;
    //   }
    // }

    if (status) {
      whereCondition.status = status;
    }

    let paintings = await this.paintingRepository.find({
      where: whereCondition,
    });

    // Filter paintings that have NOT been evaluated by this examiner (if examinerId provided)
    if (examinerId) {
      const unevaluatedPaintings = await Promise.all(
        paintings.map(async (painting) => {
          const hasEvaluated = await checkEvaluatedByExaminer(
            painting.paintingId,
            examinerId,
          );
          return hasEvaluated ? null : painting;
        }),
      );
      paintings = unevaluatedPaintings.filter((p) => p !== null);
    }

    const paintingsWithCompetitor = await Promise.all(
      paintings.map(async (painting) => {
        const competitor = await this.competitorRepository.findOne({
          where: { competitorId: painting.competitorId },
        });

        const user = await this.userRepository.findOne({
          where: { userId: painting.competitorId },
        });

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
    const existingSubmission = await this.paintingRepository.findOne({
      where: {
        competitorId: data.competitorId,
        contestId: data.contestId,
        roundId: data.roundId,
        status: 'PENDING',
      },
    });
    if (existingSubmission) {
      throw new BadRequestException(
        'You have already submitted a painting for this round and contest.',
      );
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

    const newPainting = await this.createPainting(data, url);

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
  ): Promise<Evaluation> {
    const { paintingId, examinerId, score, feedback } = evaluateDto;

    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });
    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    const contestExaminer = await this.contestExaminerRepository.findOne({
      where: {
        contestId: painting.contestId,
        examinerId: examinerId,
        status: 'ACTIVE',
      },
    });

    if (!contestExaminer) {
      throw new BadRequestException(
        `Examiner ${examinerId} is not assigned to contest ${painting.contestId} or is not active`,
      );
    }

    const existingEvaluation = await this.evaluationRepository.findOne({
      where: { paintingId, examinerId },
    });

    if (existingEvaluation) {
      existingEvaluation.scoreRound1 = score;
      existingEvaluation.feedback = feedback || '';
      existingEvaluation.evaluationDate = new Date();
      existingEvaluation.status = 'COMPLETED';

      return await this.evaluationRepository.save(existingEvaluation);
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
    return savedEvaluation;
  }

  async evaluateRound2Painting(
    evaluateDto: EvaluateRound2Dto,
  ): Promise<Evaluation> {
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

    const round = await this.roundRepository.findOne({
      where: { roundId: parseInt(painting.roundId) },
    });

    if (!round || round.name !== 'ROUND_2') {
      throw new BadRequestException(
        'This evaluation method is only for ROUND_2 paintings',
      );
    }

    const contestExaminer = await this.contestExaminerRepository.findOne({
      where: {
        contestId: painting.contestId,
        examinerId: examinerId,
        status: 'ACTIVE',
      },
    });

    if (!contestExaminer) {
      throw new BadRequestException(
        `Examiner ${examinerId} is not assigned to contest ${painting.contestId} or is not active`,
      );
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
      existingEvaluation.status = 'ACCEPTED';

      const updatedEvaluation =
        await this.evaluationRepository.save(existingEvaluation);

      return {
        ...updatedEvaluation,
        message: 'Evaluation updated successfully',
      } as any;
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
      status: 'ACTIVE',
    });

    const savedEvaluation = await this.evaluationRepository.save(newEvaluation);

    return {
      ...savedEvaluation,
      message: 'Evaluation created successfully',
    } as any;
  }

  async evaluatePreliminary(
    evaluateDto: PreliminaryEvaluationDto,
  ): Promise<any> {
    const { paintingId, examinerId, isPassed } = evaluateDto;

    const existingPainting = await this.paintingRepository.findOne({
      where: { paintingId },
    });
    if (!existingPainting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    const contestExaminer = await this.contestExaminerRepository.findOne({
      where: {
        contestId: existingPainting.contestId,
        examinerId: examinerId,
        status: 'ACTIVE',
      },
    });

    if (!contestExaminer) {
      throw new BadRequestException(
        `Examiner ${examinerId} is not assigned to contest ${existingPainting.contestId} or is not active`,
      );
    }
    const painting = new Painting();
    painting.paintingId = paintingId;
    painting.isPassed = isPassed;
    await this.paintingRepository.save(painting);
  }

  async getPaintingEvaluations(paintingId: string): Promise<any[]> {
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });

    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    const evaluations = await this.evaluationRepository.find({
      where: { paintingId },
      relations: ['examiner'],
    });

    const evaluationsWithNames = await Promise.all(
      evaluations.map(async (evaluation) => {
        const user = await this.userRepository.findOne({
          where: { userId: evaluation.examinerId },
        });

        return {
          ...evaluation,
          examinerName: user?.fullName || 'Unknown',
        };
      }),
    );

    return evaluationsWithNames;
  }

  async batchPreliminaryReview(reviewDto: PreliminaryReviewDto): Promise<any> {
    const { paintings } = reviewDto;

    if (!paintings || paintings.length === 0) {
      throw new BadRequestException('Paintings array cannot be empty');
    }

    const results: {
      success: Array<{ paintingId: string; isPassed: boolean; status: string }>;
      failed: Array<{ paintingId: string; reason: string }>;
      total: number;
    } = {
      success: [],
      failed: [],
      total: paintings.length,
    };

    for (const item of paintings) {
      try {
        const painting = await this.paintingRepository.findOne({
          where: { paintingId: item.paintingId },
        });

        if (!painting) {
          results.failed.push({
            paintingId: item.paintingId,
            reason: `Painting not found`,
          });
          continue;
        }

        painting.isPassed = item.isPassed;

        await this.paintingRepository.save(painting);

        results.success.push({
          paintingId: item.paintingId,
          isPassed: item.isPassed,
          status: painting.status,
        });
      } catch (error) {
        results.failed.push({
          paintingId: item.paintingId,
          reason: error.message || 'Unknown error',
        });
      }
    }

    return {
      success: true,
      message: `Processed ${results.total} paintings: ${results.success.length} successful, ${results.failed.length} failed`,
      data: results,
    };
  }

  async getRound2PaintingsWithAvgScore(contestId: number) {
    const rounds = await this.roundRepository.find({
      where: { contestId, name: 'ROUND_2' },
    });

    if (rounds.length === 0) {
      throw new NotFoundException(`ROUND_2 not found for contest ${contestId}`);
    }

    const topPaintingsPerTable = await Promise.all(
      rounds.map(async (round) => {
        const paintings = await this.paintingRepository.find({
          where: {
            contestId: contestId,
            roundId: round.roundId.toString(),
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
                avgScoreRound2 = totalScore / validScores.length;
                evaluationCount = validScores.length;
              }
            }

            const competitor = await this.competitorRepository.findOne({
              where: { competitorId: painting.competitorId },
            });

            let competitorName = 'Unknown';
            if (competitor) {
              const user = await this.userRepository.findOne({
                where: { userId: competitor.competitorId },
              });
              if (user) {
                competitorName = user.fullName || 'Unknown';
              }
            }

            // Get award information if painting has been awarded
            let awardInfo: any = null;
            if (painting.awardId) {
              const award = await this.awardRepository.findOne({
                where: { awardId: painting.awardId },
              });
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
              evaluationCount,
              status: painting.status,
              table: round.table || 'Unknown',
              roundId: round.roundId,
              award: awardInfo,
              createdAt: painting.createdAt,
            };
          }),
        );

        paintingsWithAvgScore.sort(
          (a, b) => b.avgScoreRound2 - a.avgScoreRound2,
        );

        return paintingsWithAvgScore[0];
      }),
    );

    const topPaintings = topPaintingsPerTable.filter(
      (painting) => painting !== null,
    );

    topPaintings.sort((a, b) => b.avgScoreRound2 - a.avgScoreRound2);

    return {
      success: true,
      message: `Top 1 from each table retrieved successfully`,
      data: topPaintings,
      count: topPaintings.length,
    };
  }
}
