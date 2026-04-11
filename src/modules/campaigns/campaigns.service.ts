import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { User } from '../users/entities/user.entity';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Sponsor)
    private readonly sponsorRepository: Repository<Sponsor>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly firebaseService: FirebaseService,
  ) {}

  async createCampaignByStaff(data: {
    createCampaignDto: CreateCampaignDto;
    staffId: string;
    imageFile?: Express.Multer.File;
  }) {
    const user = await this.usersRepository.findOne({
      where: { userId: data.staffId },
    });
    const role = user?.role;
    if (role !== 'STAFF' && role !== 'ADMIN') {
      throw new BadRequestException(
        'Only staff or admin users can create campaigns',
      );
    }

    let imageUrl: string | undefined;

    if (data.imageFile) {
      try {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `campaigns/${Date.now()}-${data.imageFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(data.imageFile.buffer, {
          metadata: { contentType: data.imageFile.mimetype },
        });

        await fileUpload.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`Failed to upload image: ${message}`);
      }
    }

    const campaignData: any = {
      ...data.createCampaignDto,
      staffId: data.staffId,
    };

    if (imageUrl) {
      campaignData.image = imageUrl;
    }

    const campaign = this.campaignRepository.create(campaignData);
    await this.campaignRepository.save(campaign);

    return {
      success: true,
      message: 'Campaign created successfully',
      data: campaign,
    };
  }

  async updateCampaignByStaff(
    campaignId: number,
    updateCampaignDto: UpdateCampaignDto,
    imageFile?: Express.Multer.File,
    staffId?: string,
  ) {
    const campaign = await this.campaignRepository.findOne({
      where: { campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (staffId) {
      const user = await this.usersRepository.findOne({
        where: { userId: staffId },
      });
      const role = user?.role;
      if (role !== 'STAFF' && role !== 'ADMIN') {
        throw new BadRequestException(
          'Only staff or admin users can update campaigns',
        );
      }
    }

    let imageUrl: string | undefined;

    if (imageFile) {
      try {
        const bucket = this.firebaseService.getStorage().bucket();
        const fileName = `campaigns/${Date.now()}-${imageFile.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(imageFile.buffer, {
          metadata: { contentType: imageFile.mimetype },
        });

        await fileUpload.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`Failed to upload image: ${message}`);
      }
    }

    const updateData: any = { ...updateCampaignDto };
    if (imageUrl) {
      updateData.image = imageUrl;
    }

    const updatedCampaign = this.campaignRepository.merge(campaign, updateData);
    await this.campaignRepository.save(updatedCampaign);

    return {
      success: true,
      message: 'Campaign updated successfully',
      data: updatedCampaign,
    };
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

    // Tính currentAmount cho từng campaign
    const campaignsWithAmount = await Promise.all(
      campaigns.map(async (campaign) => {
        const transactions = await this.transactionRepository.find({
          where: {
            campaignId: campaign.campaignId,
            status: TransactionStatus.SUCCESS,
          },
        });
        const currentAmount = transactions.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        );
        return {
          ...campaign,
          currentAmount,
        };
      }),
    );

    return {
      data: campaignsWithAmount,
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
}
