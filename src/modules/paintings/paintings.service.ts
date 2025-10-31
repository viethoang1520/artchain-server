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
import { User } from '../users/entities/user.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { Round } from '../contests/entities/round.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import {
  PreliminaryReviewDto,
  PaintingReviewItem,
} from './dto/preliminary-review.dto';

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
  ) {}

  async getPaintingsByContestId(
    contestId: number,
    roundName?: string,
    isPassed?: boolean | null,
    status?: string,
  ) {
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

          if (isPassed !== undefined) {
            if (isPassed === null) {
              condition.isPassed = IsNull();
            } else {
              condition.isPassed = isPassed;
            }
          }

          if (status) {
            condition.status = status;
          }

          return this.paintingRepository.find({ where: condition });
        });

        const paintingsArrays = await Promise.all(paintingsPromises);
        const allPaintings = paintingsArrays.flat();

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

        return paintingsWithCompetitor || [];
      }
    }

    if (isPassed !== undefined) {
      if (isPassed === null) {
        whereCondition.isPassed = IsNull();
      } else {
        whereCondition.isPassed = isPassed;
      }
    }

    if (status) {
      whereCondition.status = status;
    }

    const paintings = await this.paintingRepository.find({
      where: whereCondition,
    });

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

    return paintingsWithCompetitor || [];
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
      existingEvaluation.score = score;
      existingEvaluation.feedback = feedback || '';
      existingEvaluation.evaluationDate = new Date();
      existingEvaluation.status = 'COMPLETED';

      return await this.evaluationRepository.save(existingEvaluation);
    }

    const newEvaluation = this.evaluationRepository.create({
      paintingId,
      examinerId,
      score,
      feedback: feedback || '',
      evaluationDate: new Date(),
      status: 'COMPLETED',
    });

    return await this.evaluationRepository.save(newEvaluation);
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
}
