import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { PaymentsService } from '../payments/payments.service';
import { Tier } from '../tiers/entities/tier.entity';
import { SponsorshipTier } from '../tiers/entities/sponsorship-tier.entity';

type CampaignTierInput = {
  tierId: number;
  minPrice: number;
};

@Injectable()
export class SponsorsService {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepository: Repository<Sponsor>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Tier)
    private readonly tierRepository: Repository<Tier>,
    @InjectRepository(SponsorshipTier)
    private readonly sponsorshipTierRepository: Repository<SponsorshipTier>,
    private readonly firebaseService: FirebaseService,
    private readonly paymentService: PaymentsService,
  ) { }

  private normalizeCampaignTiersInput(input: unknown): CampaignTierInput[] {
    let parsedInput: unknown = input;

    if (typeof parsedInput === 'string') {
      try {
        parsedInput = JSON.parse(parsedInput);
      } catch {
        throw new BadRequestException('Dữ liệu tiers không đúng định dạng JSON');
      }
    }

    if (parsedInput && typeof parsedInput === 'object' && !Array.isArray(parsedInput)) {
      const maybeTier = parsedInput as Record<string, unknown>;
      if ('tierId' in maybeTier && 'minPrice' in maybeTier) {
        parsedInput = [maybeTier];
      }
    }

    if (!Array.isArray(parsedInput)) {
      throw new BadRequestException('Danh sách tiers phải là một mảng');
    }

    return parsedInput.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException('Mỗi phần tử trong tiers phải là một object hợp lệ');
      }

      const tierId = Number((item as Record<string, unknown>).tierId);
      const minPrice = Number((item as Record<string, unknown>).minPrice);

      if (!Number.isFinite(tierId) || !Number.isFinite(minPrice)) {
        throw new BadRequestException('tierId và minPrice phải là số hợp lệ');
      }

      return { tierId, minPrice };
    });
  }

  async validateCampaignSponsorshipTiersInput(
    tiersInput: unknown,
  ): Promise<CampaignTierInput[]> {
    const normalizedTiersInput = this.normalizeCampaignTiersInput(tiersInput);

    if (!normalizedTiersInput.length) {
      throw new BadRequestException('Danh sách tier không được để trống');
    }

    const uniqueTierIds = [...new Set(normalizedTiersInput.map((item) => item.tierId))];
    if (uniqueTierIds.length !== normalizedTiersInput.length) {
      throw new BadRequestException('Danh sách tier bị trùng tierId');
    }

    const tiers = await this.tierRepository.find({
      where: uniqueTierIds.map((id) => ({ id })),
    });

    if (tiers.length !== uniqueTierIds.length) {
      throw new BadRequestException('Có tierId không tồn tại trong hệ thống');
    }

    const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));

    const tiersWithPriority = normalizedTiersInput.map((item) => {
      if (item.minPrice <= 0) {
        throw new BadRequestException('Mức tài trợ tối thiểu phải lớn hơn 0');
      }

      const tier = tierMap.get(item.tierId)!;
      return {
        ...item,
        priority: tier.priority,
        tierName: tier.name,
      };
    });

    const sortedByPriority = [...tiersWithPriority].sort(
      (a, b) => a.priority - b.priority,
    );

    for (let index = 1; index < sortedByPriority.length; index++) {
      const previousTier = sortedByPriority[index - 1];
      const currentTier = sortedByPriority[index];

      if (previousTier.minPrice > currentTier.minPrice) {
        throw new BadRequestException(
          `Mức tài trợ tối thiểu của tier ưu tiên thấp hơn (${previousTier.tierName}) không được lớn hơn tier ưu tiên cao hơn (${currentTier.tierName})`,
        );
      }
    }

    return normalizedTiersInput;
  }

  async createCampaignSponsorshipTiers(
    campaignId: number,
    tiersInput: unknown,
  ) {
    const campaign = await this.campaignRepository.findOne({
      where: { campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Không tìm thấy campaign với ID ${campaignId}`);
    }

    const normalizedTiersInput =
      await this.validateCampaignSponsorshipTiersInput(tiersInput);

    const sponsorshipTiers = this.sponsorshipTierRepository.create(
      normalizedTiersInput.map((item) => {
        if (item.minPrice <= 0) {
          throw new BadRequestException('Mức tài trợ tối thiểu phải lớn hơn 0');
        }

        return {
          campaignId,
          tierId: item.tierId,
          minPrice: item.minPrice,
          maxPrice: null,
          isActive: true,
        };
      }),
    );

    return this.sponsorshipTierRepository.save(sponsorshipTiers);
  }

  async getCampaignSponsorshipTiers(campaignId: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Không tìm thấy campaign với ID ${campaignId}`);
    }

    const sponsorshipTiers = await this.sponsorshipTierRepository.find({
      where: { campaignId, isActive: true },
      relations: {
        tier: true,
      },
    });

    sponsorshipTiers.sort((a, b) => {
      const priorityA = a.tier?.priority ?? 999;
      const priorityB = b.tier?.priority ?? 999;
      return priorityA - priorityB;
    });

    return {
      success: true,
      data: sponsorshipTiers.map((item) => ({
        id: item.id,
        campaignId: item.campaignId,
        tierId: item.tierId,
        tierName: item.tier?.name,
        tierDisplay: item.tier?.display,
        minPrice: item.minPrice,
      })),
    };
  }


  async createSponsor(
    createSponsorDto: CreateSponsorDto,
    file?: Express.Multer.File,
  ) {
    const { name, contactInfo, sponsorshipAmount, campaignId } =
      createSponsorDto;
    const campaign = await this.campaignRepository.findOne({
      where: { campaignId },
    });
    if (!campaign) {
      throw new NotFoundException('Không tìm thấy campaign');
    }

    let logoUrl: string | undefined;

    if (file) {
      const bucket = this.firebaseService.getStorage().bucket();
      const fileName = `sponsors/${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });

      const [url] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: '03-09-2491',
      });

      logoUrl = url;
    }

    const sponsor = this.sponsorRepository.create({
      name,
      logoUrl,
      contactInfo,
      sponsorshipAmount,
      campaignId,
    });
    await this.sponsorRepository.save(sponsor);
    // sponsorId: string, totalAmount: number, campaignId: number
    const { checkoutUrl, qrCode, order } =
      await this.paymentService.createPayment(
        sponsor.sponsorId,
        sponsorshipAmount,
        campaignId,
      );
    return { error: false, data: { sponsor, checkoutUrl, qrCode, order } };
  }

  async getAllSponsors(status?: string) {
    const whereCondition: any = {};

    if (status) {
      whereCondition.status = status;
    }

    return await this.sponsorRepository.find({
      where: whereCondition,
      order: {
        sponsorId: 'DESC',
      },
    });
  }

  async getSponsorById(id: number) {
    const sponsor = await this.sponsorRepository.findOne({
      where: { sponsorId: id },
    });

    if (!sponsor) {
      throw new NotFoundException(`Không tìm thấy nhà tài trợ với ID ${id}`);
    }

    return sponsor;
  }

  async findAndCountByCampaign(
    campaignId: number,
    skip: number,
    take: number,
    status?: string,
  ) {
    const whereCondition: any = { campaignId };

    if (status) {
      whereCondition.status = status;
    }

    return this.sponsorRepository.findAndCount({
      where: whereCondition,
      order: {
        sponsorId: 'DESC',
      },
      skip,
      take,
    });
  }
}
