import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contest } from './entities/contests.entity';
import { Round } from './entities/round.entity';

@Injectable()
export class ContestsQueryService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Round)
    private roundsRepository: Repository<Round>,
  ) {}

  async findContestById(contestId: number) {
    return this.contestsRepository.findOne({
      where: { contestId },
    });
  }

  async countContests(where?: any) {
    if (!where) {
      return this.contestsRepository.count();
    }

    return this.contestsRepository.count({ where });
  }

  async listRecentContests(limit: number) {
    return this.contestsRepository.find({
      order: { contestId: 'DESC' },
      take: limit,
    });
  }

  async updateContestNumOfAward(contestId: number, numOfAward: number) {
    await this.contestsRepository.update({ contestId }, { numOfAward });

    return this.findContestById(contestId);
  }

  async findRoundById(roundId: number | string) {
    const normalizedRoundId =
      typeof roundId === 'string' ? Number(roundId) : roundId;

    if (Number.isNaN(normalizedRoundId)) {
      return null;
    }

    return this.roundsRepository.findOne({
      where: { roundId: normalizedRoundId },
    });
  }

  async findRoundByContestAndName(contestId: number, name: string) {
    return this.roundsRepository.findOne({
      where: { contestId, name },
    });
  }

  async findRoundsByContestAndName(contestId: number, name: string) {
    return this.roundsRepository.find({
      where: { contestId, name },
    });
  }

  async findAllRoundsByContest(contestId: number) {
    return this.roundsRepository.find({
      where: { contestId },
    });
  }

  async createRound(data: Partial<Round>) {
    const round = this.roundsRepository.create(data);
    return this.roundsRepository.save(round);
  }
}
