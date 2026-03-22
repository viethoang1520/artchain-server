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
import { Contest } from '../contests/entities/contests.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import {
  PreliminaryReviewDto,
  PaintingReviewItem,
} from './dto/preliminary-review.dto';
import { Award } from '../awards/entities/award.entity';
import { Schedule } from '../schedules/entities/schedule.entity';

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
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Contest)
    private readonly contestRepository: Repository<Contest>,
  ) {}

  async getPaintingsByContestId(
    contestId: number,
    roundName?: string,
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
  ): Promise<{ canEvaluate: boolean; data?: Evaluation; message?: string }> {
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

    // Check schedule of examiner
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedule = await this.scheduleRepository.findOne({
      where: {
        examinerId: examinerId,
        contestId: painting.contestId,
        status: 'ACTIVE',
      },
    });

    if (!schedule) {
      return {
        canEvaluate: false,
        message: 'Examiner does not have a schedule assigned for this contest',
      };
    }

    const scheduleDate = new Date(schedule.date);
    scheduleDate.setHours(0, 0, 0, 0);

    // Check if schedule enforcement is enabled for this contest
    const contest = await this.contestRepository.findOne({
      where: { contestId: painting.contestId },
    });

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

    const round = await this.roundRepository.findOne({
      where: { roundId: painting.roundId },
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

    // Kiểm tra lịch chấm bài của examiner
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate date comparison

    const schedule = await this.scheduleRepository.findOne({
      where: {
        examinerId: examinerId,
        contestId: painting.contestId,
        status: 'ACTIVE',
      },
    });

    if (!schedule) {
      return {
        canEvaluate: false,
        message: 'Examiner does not have a schedule assigned for this contest',
      };
    }

    const scheduleDate = new Date(schedule.date);
    scheduleDate.setHours(0, 0, 0, 0);

    // Check if schedule enforcement is enabled for this contest
    const contest = await this.contestRepository.findOne({
      where: { contestId: painting.contestId },
    });

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
