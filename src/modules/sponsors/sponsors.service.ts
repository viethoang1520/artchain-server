import { Injectable } from '@nestjs/common';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Campaign } from '../campaigns/entities/campaign.entity';

@Injectable()
export class SponsorsService {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepository: Repository<Sponsor>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) { }
  async createSponsor(createSponsorDto: CreateSponsorDto) {
    const { name, logoUrl, contactInfo, sponsorshipAmount, campaignId } = createSponsorDto
    const campaign = await this.campaignRepository.findOne({ where: { campaignId } });
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    const sponsor = await this.sponsorRepository.create({
      name,
      logoUrl,
      contactInfo,
      sponsorshipAmount,
      campaignId
    });
    return this.sponsorRepository.save(sponsor);
  }
}
