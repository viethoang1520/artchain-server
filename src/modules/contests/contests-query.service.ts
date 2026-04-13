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
