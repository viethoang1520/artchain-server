import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competitor } from './entities/competitors.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CompetitorsService {
  constructor(
    @InjectRepository(Competitor)
    private competitorsRepository: Repository<Competitor>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getCompetitorWithUser(competitorId: string) {
    const [competitor, user] = await Promise.all([
      this.competitorsRepository.findOne({ where: { competitorId } }),
      this.usersRepository.findOne({ where: { userId: competitorId } }),
    ]);

    return { competitor, user };
  }

  async findCompetitorById(competitorId: string) {
    return this.competitorsRepository.findOne({
      where: { competitorId },
    });
  }
}
