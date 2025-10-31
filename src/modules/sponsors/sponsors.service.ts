import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class SponsorsService {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepository: Repository<Sponsor>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    private readonly firebaseService: FirebaseService,
    private readonly paymentService: PaymentsService,
  ) { }

  async createSponsor(
    createSponsorDto: CreateSponsorDto,
    file?: Express.Multer.File,
  ) {
    const { name, contactInfo, sponsorshipAmount, campaignId } = createSponsorDto;
    const campaign = await this.campaignRepository.findOne({
      where: { campaignId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
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
    const { checkoutUrl, qrCode, order } = await this.paymentService.createPayment(sponsor.sponsorId, sponsorshipAmount, campaignId);
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
}
