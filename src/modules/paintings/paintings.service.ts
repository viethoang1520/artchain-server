import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UploadedFile,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Painting } from './entities/paintings.entity';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluatePaintingDto } from './dto/evaluate-painting.dto';
import { PreliminaryEvaluationDto } from './dto/preliminary-evaluation.dto';
import { User } from '../users/entities/user.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { Round } from '../contests/entities/round.entity';
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
  ) {}

  async getPaintingsByContestId(
    contestId: number,
    roundName?: string,
    isPassed?: boolean,
    status?: string,
  ) {
    if (!contestId) {
      throw new NotFoundException('Contest ID is required');
    }

    // If roundName is provided, need to find roundId from rounds table
    let roundId: string | undefined;
    if (roundName) {
      const round = await this.roundRepository.findOne({
        where: {
          contestId: contestId,
          name: roundName,
        },
      });

      if (round) {
        roundId = String(round.roundId);
      }
    }

    const whereCondition: any = { contestId };

    if (roundId) {
      whereCondition.roundId = roundId;
    }

    if (isPassed !== undefined) {
      whereCondition.isPassed = isPassed;
    }

    if (status) {
      whereCondition.status = status;
    }

    const paintings = await this.paintingRepository.find({
      where: whereCondition,
    });

    return paintings || [];
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

        if (item.isPassed) {
          painting.status = 'QUALIFIED';
        } else {
          painting.status = 'DISQUALIFIED';
        }

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
