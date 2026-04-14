import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user.entity';
import { CompetitorProfileDto, ProfileDto } from './dto/profile.dto';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Painting } from '../paintings/entities/paintings.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Award } from '../awards/entities/award.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Competitor)
    private competitorsRepository: Repository<Competitor>,
    @InjectRepository(Examiner)
    private examinersRepository: Repository<Examiner>,
    @InjectRepository(Painting)
    private paintingsRepository: Repository<Painting>,
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
    @InjectRepository(Award)
    private awardsRepository: Repository<Award>,
  ) {}

  async submissions(userId: string) {
    const mySubmissions = await this.paintingsRepository.find({
      where: { competitorId: userId },
    });

    if (!mySubmissions || mySubmissions.length === 0) {
      return [];
    }

    const contestIds = [
      ...new Set(mySubmissions.map((submission) => submission.contestId)),
    ];

    const contests = await this.contestsRepository.find({
      where: { contestId: In(contestIds) },
    });

    const contestMap = new Map();
    contests.forEach((contest) => {
      contestMap.set(contest.contestId, contest);
    });

    const submissionsWithContests = mySubmissions.map((submission) => ({
      ...submission,
      contest: contestMap.get(submission.contestId) || 'Unknown Contest',
    }));

    return submissionsWithContests;
  }

  async findUserById(userId: string) {
    return this.usersRepository.findOne({
      where: { userId },
    });
  }

  async findUsersByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    return this.usersRepository.find({
      where: userIds.map((userId) => ({ userId })),
    });
  }

  async countUsers(where?: any) {
    if (!where) {
      return this.usersRepository.count();
    }

    return this.usersRepository.count({ where });
  }

  async findUsersByCreatedAt(where: any) {
    return this.usersRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async findAndCountAccounts(page: number, limit: number, role?: UserRole) {
    const skip = (page - 1) * limit;
    const whereCondition: any = {};

    if (role) {
      whereCondition.role = role;
    }

    return this.usersRepository.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: {
        userId: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        positionLevel: true,
      },
    });
  }

  async updateUserStatus(userId: string, status: number) {
    await this.usersRepository.update(userId, { status });
    return this.findUserById(userId);
  }

  async me(userId: string) {
    let userRole;
    if (!userId) {
      throw new NotFoundException('User ID not found in request');
    }

    const user = await this.usersRepository.findOne({
      where: { userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = user.wallet
      ? {
          walletId: user.wallet.walletId,
          balance: Number(user.wallet.balance),
          currency: user.wallet.currency,
          status: user.wallet.status,
        }
      : null;

    userRole = user.role;
    if (userRole === UserRole.COMPETITOR) {
      const competitor = await this.competitorsRepository.findOne({
        where: { competitorId: user.userId },
      });
      const competitorProfile: CompetitorProfileDto = {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        birthday: competitor?.birthday,
        schoolName: competitor?.schoolName,
        ward: competitor?.ward,
        grade: competitor?.grade,
        role: user.role,
        wallet,
      };
      return competitorProfile;
    } else if (userRole === UserRole.EXAMINER) {
      const examiner = await this.examinersRepository.findOne({
        where: { examinerId: user.userId },
      });
      const examinerProfile = {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        specialization: examiner?.specialization,
        role: user.role,
        wallet,
      };
      return examinerProfile;
    } else if (
      userRole === UserRole.GUARDIAN ||
      userRole === UserRole.STAFF ||
      userRole === UserRole.ADMIN
    ) {
      const guardianProfile: ProfileDto = {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        wallet,
      };
      return guardianProfile;
    }
    return null;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({
      where: { userId: id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.fullName !== undefined) {
      user.fullName = updateUserDto.fullName;
    }

    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }

    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone;
    }

    await this.usersRepository.save(user);

    return {
      success: true,
      message: 'User updated successfully',
      data: {
        accountId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    };
  }

  async getAchievements(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const paintingsWithAwards = await this.paintingsRepository.find({
      where: { competitorId: userId },
      relations: ['award'],
    });

    const achievedPaintings = paintingsWithAwards.filter(
      (painting) => painting.awardId !== null && painting.award,
    );

    if (achievedPaintings.length === 0) {
      return {
        success: true,
        data: {
          user: {
            userId: user.userId,
            fullName: user.fullName,
          },
          achievements: [],
          totalAchievements: 0,
        },
      };
    }

    const contestIds = [...new Set(achievedPaintings.map((p) => p.contestId))];
    const contests = await this.contestsRepository.find({
      where: { contestId: In(contestIds) },
    });

    const contestMap = new Map();
    contests.forEach((contest) => {
      contestMap.set(contest.contestId, contest);
    });

    const achievements = achievedPaintings.map((painting) => {
      const contest = contestMap.get(painting.contestId);
      return {
        paintingId: painting.paintingId,
        paintingTitle: painting.title,
        paintingImage: painting.imageUrl,
        award: {
          awardId: painting.award.awardId,
          name: painting.award.name,
          description: painting.award.description,
          rank: painting.award.rank,
          prize: painting.award.prize,
        },
        contest: {
          contestId: contest?.contestId,
          title: contest?.title,
          startDate: contest?.startDate,
          endDate: contest?.endDate,
        },
        achievedDate: painting.updatedAt || painting.createdAt,
      };
    });

    achievements.sort((a, b) => {
      if (a.award.rank && b.award.rank) {
        return a.award.rank - b.award.rank;
      }
      return 0;
    });

    return {
      success: true,
      data: {
        user: {
          userId: user.userId,
          fullName: user.fullName,
        },
        achievements,
        totalAchievements: achievements.length,
      },
    };
  }
}
