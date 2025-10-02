import { Injectable } from '@nestjs/common';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { GetContestDto } from './dto/get-contest.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Contest } from './entities/contests.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private readonly contestRepo: Repository<Contest>
  ) { }
  async findByQuery(param: GetContestDto) {
    const { status } = param
    const contests = await this.contestRepo.find({
      where: {
        status
      }
    })

    if(!contests || contests.length === 0) {
      return [];
    }
    return contests;
  }
}
