import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  async me(req: any) {
    const userId = req.user.sub;
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

    // const profileResponse: ProfileResponseDto = {
    //   fullName: user.fullName,
    //   email: user.email,
    //   phone: user.phone,
    //   role: user.role,
    // };
    userRole = user.role;
    if (userRole === UserRole.COMPETITOR) {

    } else if (userRole === UserRole.EXAMINER) {

    }

    // const profileResponse: ProfileResponseDto = {
    //   fullName: user.fullName,
    //   email: user.email,
    //   phone: user.phone,
    //   role: user.role,
    // };
    // if (user.role === UserRole.EXAMINER) {
    //   const examiner = await this.examinersRepository.findOne({
    //     where: { user: { userId } },
    //   });

    //   if (examiner) {
    //     const contestExaminers = await this.contestExaminersRepository.find({
    //       where: { examinerId: examiner.examinerId },
    //       relations: ['contest'],
    //     });
    //     const contestDtos = contestExaminers.map((ce) => {
    //       const contestDto: ContestDto = {
    //         contestId: ce.contest.contestId,
    //         title: ce.contest.title,
    //         description: ce.contest.description,
    //         startDate: ce.contest.startDate,
    //         endDate: ce.contest.endDate,
    //         status: ce.contest.status,
    //       };
    //       return contestDto;
    //     });
    //     profileResponse.assignedContests = contestDtos;
    //   }
    // }

    // return profileResponse;

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
