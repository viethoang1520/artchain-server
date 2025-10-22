import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PaginationDto, PaginatedResponse } from './dto/pagination.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async findAllCompetitors(paginationDto: PaginationDto): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [competitors, total] = await this.usersRepository.findAndCount({
      where: { role: UserRole.COMPETITOR },
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

    const totalPages = Math.ceil(total / limit);

    return {
      data: competitors,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }


  async banUser(id: string): Promise<{ success: boolean; message: string; data: { userId: string; status: number } }> {
    const user = await this.usersRepository.findOne({
      where: { userId: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 0) {
      return {
        success: false,
        message: 'User is already banned',
        data: {
          userId: user.userId,
          status: user.status,
        },
      };
    }

    await this.usersRepository.update(id, { status: 0 });

    return {
      success: true,
      message: 'User has been successfully banned',
      data: {
        userId: id,
        status: 0,
      },
    };
  }


  async activateUser(id: string): Promise<{ success: boolean; message: string; data: { userId: string; status: number } }> {
    const user = await this.usersRepository.findOne({
      where: { userId: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 1) {
      return {
        success: false,
        message: 'User is already active',
        data: {
          userId: user.userId,
          status: user.status,
        },
      };
    }

    await this.usersRepository.update(id, { status: 1 });

    return {
      success: true,
      message: 'User has been successfully activated',
      data: {
        userId: id,
        status: 1,
      },
    };
  }
}
