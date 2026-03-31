import { Injectable } from '@nestjs/common';
import { MintNftDto } from './dto/mint-nft.dto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nft } from '../paintings/entities/nft.entity';
import { Painting } from '../paintings/entities/paintings.entity';

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
  ) {}

  async mint(
    mintNftDto: MintNftDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { receiver, paintingId } = mintNftDto;
      const [painting] = await this.paintingRepository.query(
        'SELECT painting_id, image_url, nft FROM paintings WHERE painting_id = $1',
        [paintingId],
      );

      if (!painting || !painting.image_url) {
        throw new Error(
          'Không tìm thấy bức tranh hoặc bức tranh không có URL hình ảnh.',
        );
      }

      if (painting.nft) {
        return {
          success: false,
          message: 'Bức tranh này đã được mint NFT trước đó.',
        };
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
    } catch (error) {
      console.error('Error occurred while minting NFT:', error);
      return {
        success: false,
        message: 'Failed to mint NFT.',
      };
    }
  }
}
