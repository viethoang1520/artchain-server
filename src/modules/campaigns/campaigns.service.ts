import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { SponsorsService } from '../sponsors/sponsors.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
    private readonly sponsorsService: SponsorsService,
    private readonly paymentsService: PaymentsService,
  ) { }

  async createCampaignByStaff(data: {
    createCampaignDto: CreateCampaignDto;
    staffId: string;
    imageFile?: Express.Multer.File;
  }) {
    const {
      bronzeMinPrice,
      silverMinPrice,
      goldMinPrice,
      diamondMinPrice,
      ...createCampaignPayload
    } = data.createCampaignDto;

    const user = await this.usersService.findUserById(data.staffId);
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

    const campaignData: DeepPartial<Campaign> = {
      ...createCampaignPayload,
      deadline: new Date(createCampaignPayload.deadline),
      staffId: data.staffId,
    };

    if (imageUrl) {
      campaignData.image = imageUrl;
    }

    const campaign = this.campaignRepository.create(campaignData);
    const savedCampaign = await this.campaignRepository.save(campaign);

    await this.sponsorsService.createCampaignSponsorshipTiers(
      savedCampaign.campaignId,
      {
        bronze: bronzeMinPrice,
        silver: silverMinPrice,
        gold: goldMinPrice,
        diamond: diamondMinPrice,
      },
    );

    return {
      success: true,
      message: 'Campaign created successfully',
      data: savedCampaign,
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
      const user = await this.usersService.findUserById(staffId);
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

    const amountByCampaignId =
      await this.paymentsService.getSuccessfulAmountByCampaignIds(
        campaigns.map((campaign) => campaign.campaignId),
      );
    const campaignsWithAmount = campaigns.map((campaign) => ({
      ...campaign,
      currentAmount: amountByCampaignId.get(campaign.campaignId) ?? 0,
    }));

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

  async countCampaigns(where?: any) {
    if (!where) {
      return this.campaignRepository.count();
    }

    return this.campaignRepository.count({ where });
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

    const [sponsors, total] = await this.sponsorsService.findAndCountByCampaign(
      campaignId,
      skip,
      limit,
      status,
    );

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

    const currentAmount =
      await this.paymentsService.getSuccessfulAmountByCampaignId(campaignId);

    return {
      success: true,
      data: {
        ...campaign,
        currentAmount,
      },
    };
  }
}
