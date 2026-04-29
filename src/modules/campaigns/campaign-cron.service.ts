import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';

@Injectable()
export class CampaignCronService {
  private readonly logger = new Logger(CampaignCronService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'complete-expired-active-campaigns',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async completeExpiredActiveCampaigns() {
    const now = new Date();
    this.logger.log(
      'Running cron job: Update complete expired active campaigns',
    );

    try {
      const updateResult = await this.campaignRepository.update(
        {
          status: CampaignStatus.ACTIVE,
          deadline: LessThanOrEqual(now),
        },
        {
          status: CampaignStatus.COMPLETED,
        },
      );

      const completedCount = updateResult.affected ?? 0;

      if (completedCount > 0) {
        this.logger.log(
          `Auto-completed ${completedCount} expired active campaign(s)`,
        );
      } else {
        this.logger.log('No expired active campaigns found to complete');
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to auto-complete expired active campaigns: ${err.message}`,
        err.stack,
      );
    }
  }
}
