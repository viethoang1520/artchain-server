import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contest } from './entities/contests.entity';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { GetContestDto } from './dto/get-contest.dto';
import { Round } from './entities/round.entity';
import { ContestExaminer } from './entities/contest-examiner.entity';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Round)
    private roundsRepository: Repository<Round>,
    @InjectRepository(ContestExaminer)
    private contestExaminerRepository: Repository<ContestExaminer>,
  ) {}

  async findAll(query: GetContestDto) {
    const queryBuilder = this.contestsRepository.createQueryBuilder('contest');

    if (query.status) {
      queryBuilder.where('contest.status = :status', { status: query.status });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }
    const round = await this.roundsRepository.find({
      where: { contestId: id, name: 'ROUND1' },
    });
    const roundId = round.length > 0 ? round[0].roundId : null;
    (contest as any).roundId = roundId;

    return {
      success: true,
      data: contest,
    };
  }

  async findAllForExaminer(examinerId: number) {
    // Find all contest-examiner relationships for this examiner
    const contestExaminers = await this.contestExaminerRepository.find({
      where: { examinerId },
      relations: ['contest'],
    });

    if (!contestExaminers.length) {
      return {
        success: true,
        data: [],
        meta: {
          total: 0,
        },
      };
    }

    // Extract the contests from the relationships
    const contests = contestExaminers.map((ce) => ce.contest);

    // For each contest, find if it has a ROUND1 and add roundId
    for (const contest of contests) {
      const round = await this.roundsRepository.find({
        where: { contestId: contest.contestId, name: 'ROUND1' },
      });
      (contest as any).roundId = round.length > 0 ? round[0].roundId : null;

      // Add the assignment status from the contest-examiner relationship
      const examinerRelation = contestExaminers.find(
        (ce) => ce.contestId === contest.contestId,
      );
      if (examinerRelation) {
        (contest as any).assignmentStatus = examinerRelation.status;
        (contest as any).assignmentDate = examinerRelation.assignmentDate;
        (contest as any).examinerRole = examinerRelation.role;
      }
    }

    return {
      success: true,
      data: contests,
      meta: {
        total: contests.length,
      },
    };
  }
}
