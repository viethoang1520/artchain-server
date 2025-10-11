import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user.entity';
import { CompetitorProfileDto, GuardianProfileDto } from './dto/profile.dto';
import { Examiner } from '../examiners/entities/examiners.entity';
import { Competitor } from '../competitors/entities/competitors.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Competitor)
    private competitorsRepository: Repository<Competitor>,
    @InjectRepository(Examiner)
    private examinersRepository: Repository<Examiner>,
  ) { }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  async me(userId: string) {
    let userRole;
    if (!userId) {
      throw new NotFoundException('User ID not found in request');
    }

    const user = await this.usersRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
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
      };
      return examinerProfile;
    } else if (userRole === UserRole.GUARDIAN) {
      const guardianProfile: GuardianProfileDto = {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
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

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
