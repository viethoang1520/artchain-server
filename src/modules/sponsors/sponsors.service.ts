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

type CampaignTierMinPrices = {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
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

  async createCampaignSponsorshipTiers(
    campaignId: number,
    minPrices: CampaignTierMinPrices,
  ) {
    const campaign = await this.campaignRepository.findOne({
      where: { campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const requiredTierNames = ['bronze', 'silver', 'gold', 'diamond'];
    const tiers = await this.tierRepository.find({
      where: requiredTierNames.map((name) => ({ name })),
    });

    if (tiers.length !== requiredTierNames.length) {
      throw new BadRequestException(
        'Thiếu dữ liệu tier bắt buộc trong hệ thống: bronze, silver, gold, diamond',
      );
    }

    const tierMap = new Map(tiers.map((tier) => [tier.name.toLowerCase(), tier]));

    const sponsorshipTiers = this.sponsorshipTierRepository.create([
      {
        campaignId,
        tierId: tierMap.get('bronze')!.id,
        minPrice: minPrices.bronze,
        maxPrice: null,
        isActive: true,
      },
      {
        campaignId,
        tierId: tierMap.get('silver')!.id,
        minPrice: minPrices.silver,
        maxPrice: null,
        isActive: true,
      },
      {
        campaignId,
        tierId: tierMap.get('gold')!.id,
        minPrice: minPrices.gold,
        maxPrice: null,
        isActive: true,
      },
      {
        campaignId,
        tierId: tierMap.get('diamond')!.id,
        minPrice: minPrices.diamond,
        maxPrice: null,
        isActive: true,
      },
    ]);

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
      throw new NotFoundException(`Sponsor with ID ${id} not found`);
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
