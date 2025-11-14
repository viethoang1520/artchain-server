import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { Sponsor } from '../sponsors/entities/sponsor.entity';
import {
  Transaction,
  TransactionStatus,
} from '../payments/entities/transaction.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Sponsor)
    private readonly sponsorRepository: Repository<Sponsor>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  create(createCampaignDto: CreateCampaignDto) {
    return 'This action adds a new campaign';
  }

  async getAllCampaigns(page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;

    const whereCondition: any = {};
    if (status) {
      whereCondition.status = status;
    }

    const [campaigns, total] = await this.campaignRepository.findAndCount({
      where: whereCondition,
      order: {
        campaignId: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      data: campaigns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSponsorsByCampaignId(
    campaignId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const campaign = await this.campaignRepository.findOne({
      where: { campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const skip = (page - 1) * limit;

    const whereCondition: any = { campaignId };
    if (status) {
      whereCondition.status = status;
    }

    const [sponsors, total] = await this.sponsorRepository.findAndCount({
      where: whereCondition,
      order: {
        sponsorId: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      data: sponsors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCampaignDetail(campaignId: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const transactions = await this.transactionRepository.find({
      where: { campaignId, status: TransactionStatus.SUCCESS },
    });
    const currentAmount = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    return {
      success: true,
      data: {
        ...campaign,
        currentAmount,
      },
    };
  }

  findAll() {
    return `This action returns all campaigns`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campaign`;
  }

  update(id: number, updateCampaignDto: UpdateCampaignDto) {
    return `This action updates a #${id} campaign`;
  }

  remove(id: number) {
    return `This action removes a #${id} campaign`;
  }
}
