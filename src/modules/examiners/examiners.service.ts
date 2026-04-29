import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { Examiner } from './entities/examiners.entity';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { UsersService } from '../users/users.service';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ContestsQueryService } from '../contests/contests-query.service';

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
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    private readonly usersService: UsersService,
    private readonly contestsQueryService: ContestsQueryService,
  ) {}

  private normalizeRound2Table(table?: string | null): string | null {
    if (!table) {
      return null;
    }

    const normalized = table.trim().toUpperCase();
    if (!/^[A-Z]$/.test(normalized)) {
      throw new BadRequestException(
        'Bảng của vòng chung khảo phải là một ký tự chữ cái duy nhất (A-Z)',
      );
    }

    return normalized;
  }

  private extractRound2TableFromTask(task: string): string | null {
    if (!task) {
      return null;
    }

    const normalizedTask = task.trim().toUpperCase();
    const isRound2Task =
      normalizedTask.includes('ROUND_2') ||
      normalizedTask.includes('ROUND 2') ||
      normalizedTask.includes('VONG 2') ||
      normalizedTask.includes('VÒNG 2');

    if (!isRound2Task) {
      return null;
    }

    const tableMatch = normalizedTask.match(/(?:TABLE|BANG|BẢNG)\s*([A-Z])/i);
    if (tableMatch?.[1]) {
      return tableMatch[1].toUpperCase();
    }

    return null;
  }

  private isRound2Task(task: string): boolean {
    const normalizedTask = task.toUpperCase();
    return (
      normalizedTask.includes('ROUND_2') ||
      normalizedTask.includes('ROUND 2') ||
      normalizedTask.includes('VONG 2') ||
      normalizedTask.includes('VÒNG 2')
    );
  }

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

  async createSchedule(createScheduleDto: CreateScheduleDto) {
    const user = await this.usersService.findUserById(
      createScheduleDto.examinerId,
    );

    if (!user || user.role !== UserRole.EXAMINER) {
      throw new NotFoundException(
        `Giám khảo với ID ${createScheduleDto.examinerId} không tìm thấy`,
      );
    }

    const contest = await this.contestsQueryService.findContestById(
      createScheduleDto.contestId,
    );

    if (!contest) {
      throw new NotFoundException(
        `Cuộc thi với ID ${createScheduleDto.contestId} không tìm thấy`,
      );
    }

    const contestExaminer = await this.findAssignment(
      createScheduleDto.contestId,
      createScheduleDto.examinerId,
    );

    if (!contestExaminer) {
      throw new BadRequestException(
        `Giám khảo ${createScheduleDto.examinerId} chưa được phân công cho cuộc thi ${createScheduleDto.contestId}`,
      );
    }

    const taskDerivedTable = this.extractRound2TableFromTask(
      createScheduleDto.task,
    );
    const requestedRound2Table = this.normalizeRound2Table(
      createScheduleDto.round2Table,
    );
    const round2Table = requestedRound2Table || taskDerivedTable;
    const isRound2Task = this.isRound2Task(createScheduleDto.task);

    if (isRound2Task && !round2Table) {
      throw new BadRequestException(
        'Lịch làm việc của vòng chung khảo phải bao gồm việc phân công bảng thông qua round2Table (khuyến nghị) hoặc nhiệm vụ, ví dụ: "Chấm ROUND_2 bảng A"',
      );
    }

    if (round2Table) {
      const existingRound2Schedules = await this.schedulesRepository.find({
        where: {
          examinerId: createScheduleDto.examinerId,
          contestId: createScheduleDto.contestId,
          status: 'ACTIVE',
        },
      });

      const existingAssignedTable = existingRound2Schedules
        .map(
          (item) =>
            this.normalizeRound2Table(item.round2Table) ||
            this.extractRound2TableFromTask(item.task),
        )
        .find((table) => !!table);

      if (existingAssignedTable && existingAssignedTable !== round2Table) {
        throw new BadRequestException(
          `Giám khảo ${createScheduleDto.examinerId} đã được phân công vào bảng ROUND_2 ${existingAssignedTable}. Mỗi giám khảo chỉ có thể chấm một bảng ROUND_2.`,
        );
      }
    }

    const schedule = this.schedulesRepository.create({
      ...createScheduleDto,
      round2Table: round2Table ?? undefined,
      date: new Date(createScheduleDto.date),
    });

    const savedSchedule = await this.schedulesRepository.save(schedule);

    await this.ensureExaminerAssignedSchedule(
      createScheduleDto.examinerId,
      savedSchedule.scheduleId,
    );

    return {
      success: true,
      message: 'Lịch làm việc đã được tạo thành công',
      data: savedSchedule,
    };
  }

  async getSchedulesByExaminer(examinerId: string) {
    const schedules = await this.schedulesRepository.find({
      where: { examinerId },
      order: { date: 'ASC' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedulesWithCanEvaluate = await Promise.all(
      schedules.map(async (schedule) => {
        const contest = await this.contestsQueryService.findContestById(
          schedule.contestId,
        );

        let canEvaluate = false;

        if (!contest || !contest.isScheduleEnforced) {
          canEvaluate = schedule.status === 'ACTIVE';
        } else {
          const scheduleDate = new Date(schedule.date);
          scheduleDate.setHours(0, 0, 0, 0);

          canEvaluate =
            schedule.status === 'ACTIVE' &&
            scheduleDate.getTime() === today.getTime();
        }

        return {
          ...schedule,
          canEvaluate,
          isScheduleEnforced: contest?.isScheduleEnforced || false,
        };
      }),
    );

    return {
      success: true,
      data: schedulesWithCanEvaluate,
      meta: {
        total: schedules.length,
      },
    };
  }

  async getSchedulesByContestAndExaminer(
    contestId: number,
    examinerId: string,
  ) {
    const schedules = await this.schedulesRepository.find({
      where: { contestId, examinerId },
      order: { date: 'ASC' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedulesWithCanEvaluate = await Promise.all(
      schedules.map(async (schedule) => {
        const contest = await this.contestsQueryService.findContestById(
          schedule.contestId,
        );

        let canEvaluate = false;

        if (!contest || !contest.isScheduleEnforced) {
          canEvaluate = schedule.status === 'ACTIVE';
        } else {
          const scheduleDate = new Date(schedule.date);
          scheduleDate.setHours(0, 0, 0, 0);

          canEvaluate =
            schedule.status === 'ACTIVE' &&
            scheduleDate.getTime() === today.getTime();
        }

        return {
          ...schedule,
          canEvaluate,
          isScheduleEnforced: contest?.isScheduleEnforced || false,
        };
      }),
    );

    return schedulesWithCanEvaluate;
  }

  async getSchedulesByContest(contestId: number) {
    const schedules = await this.schedulesRepository.find({
      where: { contestId },
      order: { date: 'ASC' },
    });

    const schedulesWithExaminer = await Promise.all(
      schedules.map(async (schedule) => {
        const user = await this.usersService.findUserById(schedule.examinerId);

        return {
          ...schedule,
          examinerName: user?.fullName || 'Unknown',
          examinerEmail: user?.email || null,
        };
      }),
    );

    return {
      success: true,
      data: schedulesWithExaminer,
      meta: {
        total: schedulesWithExaminer.length,
      },
    };
  }

  async updateSchedule(
    scheduleId: number,
    updateScheduleDto: UpdateScheduleDto,
  ) {
    const schedule = await this.schedulesRepository.findOne({
      where: { scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    if (updateScheduleDto.date && updateScheduleDto.date.trim() !== '') {
      (updateScheduleDto as any).date = new Date(updateScheduleDto.date);
    } else if (updateScheduleDto.date === '') {
      delete (updateScheduleDto as any).date;
    }

    const taskToCheck = updateScheduleDto.task || schedule.task;
    const requestedRound2Table = this.normalizeRound2Table(
      updateScheduleDto.round2Table ?? schedule.round2Table,
    );
    const taskDerivedTable = this.extractRound2TableFromTask(taskToCheck);
    const nextRound2Table = requestedRound2Table || taskDerivedTable;

    if (this.isRound2Task(taskToCheck) && !nextRound2Table) {
      throw new BadRequestException(
        'Lịch làm việc của vòng chung khảo phải bao gồm việc phân công bảng thông qua round2Table (khuyến nghị) hoặc nhiệm vụ',
      );
    }

    if (nextRound2Table) {
      const existingRound2Schedules = await this.schedulesRepository.find({
        where: {
          examinerId: updateScheduleDto.examinerId || schedule.examinerId,
          contestId: updateScheduleDto.contestId || schedule.contestId,
          status: 'ACTIVE',
        },
      });

      const conflict = existingRound2Schedules.find((item) => {
        if (item.scheduleId === schedule.scheduleId) {
          return false;
        }

        const existingTable =
          this.normalizeRound2Table(item.round2Table) ||
          this.extractRound2TableFromTask(item.task);

        return !!existingTable && existingTable !== nextRound2Table;
      });

      if (conflict) {
        throw new BadRequestException(
          `Mỗi giám khảo chỉ có thể đánh giá một bảng vòng chung khảo của mỗi cuộc thi. Xung đột với lịch làm việc ${conflict.scheduleId}.`,
        );
      }
    }

    (updateScheduleDto as any).round2Table = nextRound2Table;

    Object.assign(schedule, updateScheduleDto);
    const updatedSchedule = await this.schedulesRepository.save(schedule);

    return {
      success: true,
      message: 'Lịch làm việc đã được cập nhật thành công',
      data: updatedSchedule,
    };
  }

  async deleteSchedule(scheduleId: number) {
    const schedule = await this.schedulesRepository.findOne({
      where: { scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    await this.schedulesRepository.remove(schedule);

    return {
      success: true,
      message: 'Lịch làm việc đã được xóa thành công',
    };
  }

  async findActiveScheduleByExaminerAndContest(
    examinerId: string,
    contestId: number,
  ) {
    return this.schedulesRepository.findOne({
      where: {
        examinerId,
        contestId,
        status: 'ACTIVE',
      },
    });
  }

  async getAssignedRound2TableByExaminerAndContest(
    examinerId: string,
    contestId: number,
  ): Promise<string | null> {
    const schedules = await this.schedulesRepository.find({
      where: {
        examinerId,
        contestId,
        status: 'ACTIVE',
      },
    });

    for (const schedule of schedules) {
      const table =
        this.normalizeRound2Table(schedule.round2Table) ||
        this.extractRound2TableFromTask(schedule.task);
      if (table) {
        return table;
      }
    }

    return null;
  }
}
