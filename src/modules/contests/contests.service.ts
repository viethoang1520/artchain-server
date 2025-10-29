import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contest, ContestStatus } from './entities/contests.entity';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { GetContestDto } from './dto/get-contest.dto';
import { Round } from './entities/round.entity';
import { ContestExaminer } from './entities/contest-examiner.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Round)
    private roundsRepository: Repository<Round>,
    @InjectRepository(ContestExaminer)
    private contestExaminerRepository: Repository<ContestExaminer>,
    @InjectRepository(Examiner)
    private examinerRepository: Repository<Examiner>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

    const rounds = await this.roundsRepository.find({
      where: { contestId: id },
    });

    const contestExaminers = await this.contestExaminerRepository.find({
      where: { contestId: id },
      relations: ['examiner'],
    });

    const examinersWithNames = await Promise.all(
      contestExaminers.map(async (ce) => {
        const user = await this.userRepository.findOne({
          where: { userId: ce.examinerId },
        });

        return {
          ...ce,
          examinerName: user?.fullName || 'Unknown',
          examinerEmail: user?.email || null,
        };
      }),
    );


    return {
      success: true,
      data: {
        ...contest,
        rounds: rounds,
        examiners: examinersWithNames,
      },
    };
  }

  async findAllForExaminer(examinerId: string) {
    const examiner = await this.examinerRepository.findOne({
      where: { examinerId },
    });
    if (!examiner) {
      throw new NotFoundException(`Examiner with ID ${examinerId} not found`);
    }
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

    const contests = contestExaminers.map((ce) => ce.contest);

    for (const contest of contests) {
      const round = await this.roundsRepository.find({
        where: { contestId: contest.contestId, name: 'ROUND1' },
      });
      (contest as any).roundId = round.length > 0 ? round[0].roundId : null;

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

  async create(createContestDto: CreateContestDto) {
    try {
      const contest = this.contestsRepository.create({
        title: createContestDto.title,
        description: createContestDto.description,
        bannerUrl: createContestDto.bannerUrl,
        numOfAward: createContestDto.numOfAward,
        startDate: createContestDto.startDate,
        endDate: createContestDto.endDate,
        status: createContestDto.status || ContestStatus.DRAFT,
        createdBy: createContestDto.createdBy,
      });

      const savedContest = await this.contestsRepository.save(contest);

      const savedRounds: Round[] = [];
      if (createContestDto.rounds && createContestDto.rounds.length > 0) {
        for (const roundDto of createContestDto.rounds) {
          const round = this.roundsRepository.create({
            contestId: savedContest.contestId,
            name: roundDto.name,
            table: roundDto.table,
            startDate: roundDto.startDate,
            endDate: roundDto.endDate,
            submissionDeadline: roundDto.submissionDeadline,
            resultAnnounceDate: roundDto.resultAnnounceDate,
            sendOriginalDeadline: roundDto.sendOriginalDeadline,
            status: roundDto.status || 'DRAFT',
          });
          const savedRound = await this.roundsRepository.save(round);
          savedRounds.push(savedRound);
        }
      }

      return {
        success: true,
        message: 'Contest created successfully',
        data: {
          contest: savedContest,
          rounds: savedRounds,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, updateContestDto: UpdateContestDto) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }
    const { rounds, ...contestData } = updateContestDto as any;
    const updatedContest = this.contestsRepository.merge(contest, contestData);
    const savedContest = await this.contestsRepository.save(updatedContest);

    let savedRounds: Round[] = [];
    if (rounds && Array.isArray(rounds)) {
      const existingRounds = await this.roundsRepository.find({
        where: { contestId: id },
      });

      if (existingRounds.length > 0) {
        await this.roundsRepository.remove(existingRounds);
      }

      for (const roundDto of rounds) {
        const round = this.roundsRepository.create({
          contestId: id,
          name: roundDto.name,
          table: roundDto.table,
          startDate: roundDto.startDate,
          endDate: roundDto.endDate,
          submissionDeadline: roundDto.submissionDeadline,
          resultAnnounceDate: roundDto.resultAnnounceDate,
          sendOriginalDeadline: roundDto.sendOriginalDeadline,
          status: roundDto.status || 'DRAFT',
        });
        const savedRound = await this.roundsRepository.save(round);
        savedRounds.push(savedRound);
      }
    }

    return {
      success: true,
      message: 'Contest updated successfully',
      data: {
        contest: savedContest,
        rounds: savedRounds.length > 0 ? savedRounds : undefined,
      },
    };
  }

  async publish(id: number) {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    if (contest.status !== ContestStatus.DRAFT) {
      return {
        success: false,
        message: `Contest can only be published from DRAFT status. Current status: ${contest.status}`,
      };
    }

    const now = new Date();
    const startDate = new Date(contest.startDate);
    const endDate = new Date(contest.endDate);

    let newStatus: ContestStatus;
    if (now < startDate) {
      newStatus = ContestStatus.UPCOMING;
    } else if (now >= startDate && now <= endDate) {
      newStatus = ContestStatus.ACTIVE;
    } else {
      newStatus = ContestStatus.ENDED;
    }

    contest.status = newStatus;
    const publishedContest = await this.contestsRepository.save(contest);

    return {
      success: true,
      message: `Contest published successfully with status: ${newStatus}`,
      data: publishedContest,
    };
  }
}
