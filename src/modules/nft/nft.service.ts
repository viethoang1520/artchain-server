import { Injectable } from '@nestjs/common';
import { MintNftDto } from './dto/mint-nft.dto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nft } from './entities/nft.entity';
import { PaintingsService } from '../paintings/paintings.service';
import { CompetitorsService } from '../competitors/competitor.service';

type MintApiResponse = {
  transaction_hash: string;
  cid: string;
  token_id?: string | null;
};

@Injectable()
export class NftService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    private readonly paintingsService: PaintingsService,
    private readonly competitorsService: CompetitorsService,
  ) {}

  async mint(
    mintNftDto: MintNftDto,
  ): Promise<{ success: boolean; message: string; data: any }> {
    const { receiver, paintingId } = mintNftDto;
    const painting = await this.paintingsService.findPaintingById(paintingId);

    const competitor = painting?.competitorId
      ? await this.competitorsService.getCompetitorWithUser(
          painting.competitorId,
        )
      : null;

    if (!painting || !painting.imageUrl) {
      throw new Error(
        'Không tìm thấy bức tranh hoặc bức tranh không có URL hình ảnh.',
      );
    }

    if (painting.nft) {
      throw new Error('Bức tranh này đã được mint NFT trước đó.');
    }

    const imageUrl = painting.imageUrl;
    const response = await fetch(
      this.configService.get('NFT_URL') || 'http://localhost:3001/api/mint-nft',
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
          author: competitor?.user?.fullName || 'Unknown Artist',
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Mint API failed with status ${response.status}`);
    }

    const data = (await response.json()) as MintApiResponse;
    const { transaction_hash, cid, token_id } = data;

    await this.nftRepository.save({
      transactionHash: transaction_hash,
      cid,
      tokenId: token_id ?? undefined,
    });

    await this.paintingsService.markPaintingMinted(
      paintingId,
      transaction_hash,
    );

    return {
      success: true,
      data: {
        transactionHash: transaction_hash,
        cid,
        tokenId: token_id ?? null,
      },
      message: `NFT minted successfully. tx: ${transaction_hash}, cid: ${cid}`,
    };
  }
}
