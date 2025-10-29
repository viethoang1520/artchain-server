import { BadRequestException, Injectable, NotFoundException, UploadedFile } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Painting } from './entities/paintings.entity';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluatePaintingDto } from './dto/evaluate-painting.dto';
import { PreliminaryEvaluationDto } from './dto/preliminary-evaluation.dto';
import { User } from '../users/entities/user.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';

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
  ) { }




  async getPaintingsByContestId(contestId: number) {
    if (!contestId) {
      throw new NotFoundException('Contest ID is required');
    }
    const paintings = await this.paintingRepository.find({
      where: { contestId },
    });
    if (!paintings) {
      throw new NotFoundException(
        `No paintings found for contest ID ${contestId}`,
      );
    }
    return paintings;
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
      throw new BadRequestException('You have already submitted a painting for this round and contest.');
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

    // Kiểm tra painting có tồn tại không
    const painting = await this.paintingRepository.findOne({
      where: { paintingId },
    });
    if (!painting) {
      throw new NotFoundException(`Painting with ID ${paintingId} not found`);
    }

    // Kiểm tra examiner có được gán vào contest này không
    const contestExaminer = await this.contestExaminerRepository.findOne({
      where: {
        contestId: painting.contestId,
        examinerId: examinerId,
        status: 'ACTIVE', // Chỉ cho phép examiner có status ACTIVE
      },
    });

    if (!contestExaminer) {
      throw new BadRequestException(
        `Examiner ${examinerId} is not assigned to contest ${painting.contestId} or is not active`,
      );
    }

    // Kiểm tra xem examiner đã chấm bức tranh này chưa
    const existingEvaluation = await this.evaluationRepository.findOne({
      where: { paintingId, examinerId },
    });

    if (existingEvaluation) {
      // Cập nhật evaluation hiện tại
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


  async evaluatePreliminary(evaluateDto: PreliminaryEvaluationDto): Promise<any> {
    const { paintingId, examinerId, isPassed } = evaluateDto;

    // Kiểm tra painting có tồn tại không
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

    // Thêm tên examiner vào mỗi evaluation
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
}
