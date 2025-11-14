import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Contest, ContestStatus } from '../contests/entities/contests.entity';

@Injectable()
export class ContestCronService {
  private readonly logger = new Logger(ContestCronService.name);

  constructor(
    @InjectRepository(Contest)
    private contestsRepository: Repository<Contest>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'update-ended-contests',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleEndedContests() {
    this.logger.log('Running cron job: Update ended contests');

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0); 

      const expiredContests = await this.contestsRepository.find({
        where: [
          {
            endDate: LessThanOrEqual(now),
            status: ContestStatus.ACTIVE,
          },
          {
            endDate: LessThanOrEqual(now),
            status: ContestStatus.UPCOMING,
          },
          {
            endDate: LessThanOrEqual(now),
            status: ContestStatus.DRAFT,
          },
        ],
      });

      if (expiredContests.length === 0) {
        this.logger.log('No expired contests found');
        return;
      }

      this.logger.log(`Found ${expiredContests.length} expired contests`);

      // Cập nhật status thành ENDED
      const updatePromises = expiredContests.map((contest) => {
        this.logger.log(
          `Updating contest ID ${contest.contestId} (${contest.title}) to ENDED`,
        );
        return this.contestsRepository.update(
          { contestId: contest.contestId },
          { status: ContestStatus.ENDED },
        );
      });

      await Promise.all(updatePromises);

      this.logger.log(
        `Successfully updated ${expiredContests.length} contests to ENDED status`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating ended contests: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cron job chạy mỗi giờ để cập nhật status của contests
   * - DRAFT hoặc UPCOMING → ACTIVE nếu hôm nay nằm trong khoảng startDate và endDate
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'update-active-contests',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleActiveContests() {
    this.logger.log('Running cron job: Update active contests');

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to start of today

      // Tìm các contests có startDate <= hôm nay <= endDate và status là UPCOMING
      const contestsToActivate = await this.contestsRepository
        .createQueryBuilder('contest')
        .where('contest.start_date <= :now', { now })
        .andWhere('contest.end_date >= :now', { now })
        .andWhere('contest.status IN (:...statuses)', {
          statuses: [ContestStatus.UPCOMING],
        })
        .getMany();

      if (contestsToActivate.length === 0) {
        this.logger.log('No contests to activate');
        return;
      }

      this.logger.log(
        `Found ${contestsToActivate.length} contests to activate`,
      );

      const updatePromises = contestsToActivate.map((contest) => {
        this.logger.log(
          `Activating contest ID ${contest.contestId} (${contest.title})`,
        );
        return this.contestsRepository.update(
          { contestId: contest.contestId },
          { status: ContestStatus.ACTIVE },
        );
      });

      await Promise.all(updatePromises);

      this.logger.log(
        `Successfully activated ${contestsToActivate.length} contests`,
      );
    } catch (error) {
      this.logger.error(
        `Error activating contests: ${error.message}`,
        error.stack,
      );
    }
  }
}
