import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tier } from './entities/tier.entity';

@Injectable()
export class TiersService {
  constructor(
    @InjectRepository(Tier)
    private readonly tierRepository: Repository<Tier>,
  ) { }

  async findAll() {
    const tiers = await this.tierRepository.find({
      order: {
        priority: 'ASC',
        id: 'ASC',
      },
    });

    return {
      success: true,
      data: tiers,
    };
  }
}
