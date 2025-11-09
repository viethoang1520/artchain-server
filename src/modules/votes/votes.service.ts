import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote } from './entities/vote.entity';
import { CreateVoteDto } from './dto/create-vote.dto';
import { Painting } from '../paintings/entities/paintings.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Award } from '../awards/entities/award.entity';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private readonly votesRepository: Repository<Vote>,
    @InjectRepository(Painting)
    private readonly paintingsRepository: Repository<Painting>,
    @InjectRepository(Contest)
    private readonly contestsRepository: Repository<Contest>,
    @InjectRepository(Award)
    private readonly awardsRepository: Repository<Award>,
  ) {}

  
}
