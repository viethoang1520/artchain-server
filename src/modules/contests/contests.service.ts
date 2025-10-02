import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contest } from './entities/contests.entity';
import { ContestResponseDto } from './dto/contest-response.dto';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
  ) {}

  async findAll(): Promise<ContestResponseDto[]> {
    const contests = await this.contestsRepository.find();
    return contests.map((contest) => new ContestResponseDto(contest));
  }

  async findOne(id: number): Promise<ContestResponseDto> {
    const contest = await this.contestsRepository.findOne({
      where: { contestId: id },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    return new ContestResponseDto(contest);
  }
}
