import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContestExaminer } from '../contests/entities/contest-examiner.entity';
import { Contest } from '../contests/entities/contests.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { Schedule } from './entities/schedule.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Contest)
    private readonly contestsRepository: Repository<Contest>,
    @InjectRepository(ContestExaminer)
    private readonly contestExaminersRepository: Repository<ContestExaminer>,
    @InjectRepository(Examiner)
    private readonly examinersRepository: Repository<Examiner>,
  ) {}

  async createSchedule(createScheduleDto: CreateScheduleDto) {
    const user = await this.usersRepository.findOne({
      where: { userId: createScheduleDto.examinerId, role: UserRole.EXAMINER },
    });

    if (!user) {
      throw new NotFoundException(
        `Examiner with ID ${createScheduleDto.examinerId} not found`,
      );
    }

    const contest = await this.contestsRepository.findOne({
      where: { contestId: createScheduleDto.contestId },
    });

    if (!contest) {
      throw new NotFoundException(
        `Contest with ID ${createScheduleDto.contestId} not found`,
      );
    }

    const contestExaminer = await this.contestExaminersRepository.findOne({
      where: {
        contestId: createScheduleDto.contestId,
        examinerId: createScheduleDto.examinerId,
      },
    });

    if (!contestExaminer) {
      throw new BadRequestException(
        `Examiner with ID ${createScheduleDto.examinerId} is not assigned to contest ${createScheduleDto.contestId}`,
      );
    }

    const schedule = this.schedulesRepository.create({
      ...createScheduleDto,
      date: new Date(createScheduleDto.date),
    });

    const savedSchedule = await this.schedulesRepository.save(schedule);

    let examiner = await this.examinersRepository.findOne({
      where: { examinerId: createScheduleDto.examinerId },
    });

    if (!examiner) {
      examiner = this.examinersRepository.create({
        examinerId: createScheduleDto.examinerId,
        assignedScheduleId: savedSchedule.scheduleId,
      });
      await this.examinersRepository.save(examiner);
    } else if (!examiner.assignedScheduleId) {
      examiner.assignedScheduleId = savedSchedule.scheduleId;
      await this.examinersRepository.save(examiner);
    }

    return {
      success: true,
      message: 'Schedule created successfully',
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
        const contest = await this.contestsRepository.findOne({
          where: { contestId: schedule.contestId },
        });

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

  async getSchedulesByContest(contestId: number) {
    const schedules = await this.schedulesRepository.find({
      where: { contestId },
      order: { date: 'ASC' },
    });

    const schedulesWithExaminer = await Promise.all(
      schedules.map(async (schedule) => {
        const user = await this.usersRepository.findOne({
          where: { userId: schedule.examinerId },
        });

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

    Object.assign(schedule, updateScheduleDto);
    const updatedSchedule = await this.schedulesRepository.save(schedule);

    return {
      success: true,
      message: 'Schedule updated successfully',
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
      message: 'Schedule deleted successfully',
    };
  }
}
