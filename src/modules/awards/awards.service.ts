import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Award } from './entities/award.entity';
import { Contest } from '../contests/entities/contests.entity';
import { CreateAwardDto } from './dto/create-award.dto';
import { UpdateAwardDto } from './dto/update-award.dto';

@Injectable()
export class AwardsService {
  constructor(
    @InjectRepository(Award)
    private readonly awardRepository: Repository<Award>,
    @InjectRepository(Contest)
    private readonly contestRepository: Repository<Contest>,
  ) {}

  async create(createAwardDto: CreateAwardDto) {
    const contest = await this.contestRepository.findOne({
      where: { contestId: createAwardDto.contestId },
    });

    if (!contest) {
      throw new NotFoundException(
        `Contest with ID ${createAwardDto.contestId} not found`,
      );
    }

    const award = this.awardRepository.create(createAwardDto);
    const savedAward = await this.awardRepository.save(award);

    return {
      success: true,
      message: 'Award created successfully',
      data: savedAward,
    };
  }

  async findAll() {
    const awards = await this.awardRepository.find({
      relations: ['contest'],
      order: { contestId: 'DESC', rank: 'ASC' },
    });

    return {
      success: true,
      data: awards,
      meta: {
        total: awards.length,
      },
    };
  }

  async findByContestId(contestId: number) {
    const contest = await this.contestRepository.findOne({
      where: { contestId },
    });

    if (!contest) {
      throw new NotFoundException(`Contest with ID ${contestId} not found`);
    }

    const awards = await this.awardRepository.find({
      where: { contestId },
      order: { rank: 'ASC' },
    });

    return {
      success: true,
      data: awards,
      meta: {
        contestId,
        total: awards.length,
      },
    };
  }

  async findOne(id: number) {
    const award = await this.awardRepository.findOne({
      where: { awardId: id },
      relations: ['contest', 'paintings'],
    });

    if (!award) {
      throw new NotFoundException(`Award with ID ${id} not found`);
    }

    return {
      success: true,
      data: award,
    };
  }

  async update(id: number, updateAwardDto: UpdateAwardDto) {
    const award = await this.awardRepository.findOne({
      where: { awardId: id },
    });

    if (!award) {
      throw new NotFoundException(`Award with ID ${id} not found`);
    }

    if (
      updateAwardDto.contestId &&
      updateAwardDto.contestId !== award.contestId
    ) {
      const contest = await this.contestRepository.findOne({
        where: { contestId: updateAwardDto.contestId },
      });

      if (!contest) {
        throw new NotFoundException(
          `Contest with ID ${updateAwardDto.contestId} not found`,
        );
      }
    }

    Object.assign(award, updateAwardDto);
    const updatedAward = await this.awardRepository.save(award);

    return {
      success: true,
      message: 'Award updated successfully',
      data: updatedAward,
    };
  }

  async remove(id: number) {
    const award = await this.awardRepository.findOne({
      where: { awardId: id },
    });

    if (!award) {
      throw new NotFoundException(`Award with ID ${id} not found`);
    }

    await this.awardRepository.remove(award);

    return {
      success: true,
      message: 'Award deleted successfully',
    };
  }
}
