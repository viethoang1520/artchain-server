import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contest } from './entities/contests.entity';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { GetContestDto } from './dto/get-contest.dto';
import { Round } from './entities/round.entity';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Round)
    private roundsRepository: Repository<Round>,
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
      where: { contestId: id, name: "ROUND1" },
    });
    const roundId = round.length > 0 ? round[0].roundId : null;
    (contest as any).roundId = roundId;

    return {
      success: true,
      data: contest,
    };
  }
}
