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

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profileResponse: ProfileResponseDto = {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    if (user.role === UserRole.EXAMINER) {
      const examiner = await this.examinersRepository.findOne({
        where: { user: { userId } },
      });

      if (examiner) {
        const contestExaminers = await this.contestExaminersRepository.find({
          where: { examinerId: examiner.examinerId },
          relations: ['contest'],
        });
        const contestDtos = contestExaminers.map((ce) => {
          const contestDto: ContestDto = {
            contestId: ce.contest.contestId,
            title: ce.contest.title,
            description: ce.contest.description,
            startDate: ce.contest.startDate,
            endDate: ce.contest.endDate,
            status: ce.contest.status,
          };
          return contestDto;
        });
        profileResponse.assignedContests = contestDtos;
      }
    }

    return profileResponse;
  }
}
