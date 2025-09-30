import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';

import { ProfileResponseDto, ContestDto } from '../users/dto/profile.dto';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Contest } from '../contests/entities/contests.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Competitor)
    private competitorsRepository: Repository<Competitor>,

    @InjectRepository(Examiner)
    private examinersRepository: Repository<Examiner>,

    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,

    @InjectRepository(ContestExaminer)
    private contestExaminersRepository: Repository<ContestExaminer>,
  ) { }

}
