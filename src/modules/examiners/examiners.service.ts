import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { Examiner } from './entities/examiners.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { UsersService } from '../users/users.service';

type ExaminerRef = {
  examinerId: string;
};

@Injectable()
export class ExaminersService {
  constructor(
    @InjectRepository(Examiner)
    private examinersRepository: Repository<Examiner>,
    @InjectRepository(ContestExaminer)
    private contestExaminersRepository: Repository<ContestExaminer>,
    private readonly usersService: UsersService,
  ) {}

  async getAllExaminers() {
    const examiners = await this.usersService.findUsersByRole(
      UserRole.EXAMINER,
    );

    const examinersWithDetails = await Promise.all(
      examiners.map(async (user) => {
        const examinerDetails = await this.examinersRepository.findOne({
          where: { examinerId: user.userId },
        });

        return {
          examinerId: user.userId,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          status: user.status,
          specialization: examinerDetails?.specialization || null,
          assignedScheduleId: examinerDetails?.assignedScheduleId || null,
        };
      }),
    );

    return {
      success: true,
      data: examinersWithDetails,
      meta: {
        total: examinersWithDetails.length,
      },
    };
  }

  async findExaminerById(examinerId: string) {
    return this.examinersRepository.findOne({
      where: { examinerId },
    });
  }

  async enrichWithExaminerProfile<T extends ExaminerRef>(items: T[]) {
    const examinerIds = [...new Set(items.map((item) => item.examinerId))];

    const users = await this.usersService.findUsersByIds(examinerIds);

    const userMap = new Map(users.map((user) => [user.userId, user]));

    return items.map((item) => {
      const user = userMap.get(item.examinerId);
      return {
        ...item,
        examinerName: user?.fullName || 'Unknown',
        examinerEmail: user?.email || null,
      };
    });
  }

  async getAssignmentsByContestId(contestId: number) {
    return this.contestExaminersRepository.find({
      where: { contestId },
      relations: ['examiner'],
    });
  }

  async getAssignmentsByExaminerId(examinerId: string) {
    return this.contestExaminersRepository.find({
      where: { examinerId },
      relations: ['contest'],
    });
  }

  async findAssignment(contestId: number, examinerId: string) {
    return this.contestExaminersRepository.findOne({
      where: { contestId, examinerId },
    });
  }

  async findActiveAssignment(contestId: number, examinerId: string) {
    return this.contestExaminersRepository.findOne({
      where: { contestId, examinerId, status: 'ACTIVE' },
    });
  }

  async createAssignment(contestId: number, examinerId: string, role: string) {
    const contestExaminer = this.contestExaminersRepository.create({
      contestId,
      examinerId,
      role,
      assignmentDate: new Date(),
    });

    return this.contestExaminersRepository.save(contestExaminer);
  }

  async findAssignmentWithRelations(contestId: number, examinerId: string) {
    return this.contestExaminersRepository.findOne({
      where: { contestId, examinerId },
      relations: ['contest', 'examiner'],
    });
  }

  async removeAssignment(assignment: ContestExaminer) {
    return this.contestExaminersRepository.delete({
      contestId: assignment.contestId,
      examinerId: assignment.examinerId,
    });
  }

  async ensureExaminerAssignedSchedule(examinerId: string, scheduleId: number) {
    let examiner = await this.examinersRepository.findOne({
      where: { examinerId },
    });

    if (!examiner) {
      examiner = this.examinersRepository.create({
        examinerId,
        assignedScheduleId: scheduleId,
      });
      return this.examinersRepository.save(examiner);
    }

    if (!examiner.assignedScheduleId) {
      examiner.assignedScheduleId = scheduleId;
      return this.examinersRepository.save(examiner);
    }

    return examiner;
  }
}
