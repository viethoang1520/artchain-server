import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class SponsorsService {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepository: Repository<Sponsor>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    private readonly firebaseService: FirebaseService,
  ) {}

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

    return this.sponsorRepository.save(sponsor);
  }
}
