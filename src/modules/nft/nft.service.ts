import { Injectable } from '@nestjs/common';
import { MintNftDto } from './dto/mint-nft.dto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Painting } from '../paintings/entities/paintings.entity';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Nft } from './entities/nft.entity';

type MintApiResponse = {
  transaction_hash: string;
  cid: string;
};

@Injectable()
export class NftService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(Painting)
    private readonly paintingRepository: Repository<Painting>,
    @InjectRepository(Competitor)
    private readonly competitorRepository: Repository<Competitor>
  ) { }

  async mint(
    mintNftDto: MintNftDto,
  ): Promise<{ success: boolean; message: string }> {
    const { receiver, paintingId } = mintNftDto;
    const [painting] = await this.paintingRepository.query(
      'SELECT painting_id, competitor_id, image_url, title, description, nft FROM paintings WHERE painting_id = $1',
      [paintingId],
    );
    const competitor = await this.competitorRepository.findOne({
      where: { competitorId: painting.competitor_id },
    });

    if (!painting || !painting.image_url) {
      throw new Error(
        'Không tìm thấy bức tranh hoặc bức tranh không có URL hình ảnh.',
      );
    }

    if (painting.nft) {
      throw new Error('Bức tranh này đã được mint NFT trước đó.');
    }

    const imageUrl = painting.image_url as string;
    console.log('first: ', imageUrl, receiver);
    const response = await fetch(
      this.configService.get('NFT_URL') ||
      'http://localhost:3001/api/mint-nft',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          receiver,
          title: painting.title,
          description: painting.description,
          author: competitor?.user.fullName || 'Unknown Artist',
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Mint API failed with status ${response.status}`);
    }

    const data = (await response.json()) as MintApiResponse;
    console.log('data: ', data);
    const { transaction_hash, cid } = data;

    await this.nftRepository.save({
      transactionHash: transaction_hash,
      cid,
    });

    await this.paintingRepository.query(
      'UPDATE paintings SET nft = $1 WHERE painting_id = $2',
      [transaction_hash, paintingId],
    );

    return {
      success: true,
      message: `NFT minted successfully. tx: ${transaction_hash}, cid: ${cid}`,
    };
  }
}
