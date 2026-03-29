import { Injectable } from '@nestjs/common';
import { MintNftDto } from './dto/mint-nft.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

type MintApiResponse = {
  transaction_hash: string;
  cid: string;
};

@Injectable()
export class NftService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) { }

  async mint(mintNftDto: MintNftDto): Promise<{ success: boolean; message: string }> {
    const { imageUrl, receiver } = mintNftDto;
    const { data } = await firstValueFrom(
      this.httpService.post<MintApiResponse>(this.configService.get('NFT_URL') || 'http://localhost:3000/cats', {
        imageUrl,
        receiver,
      }),
    );
    const { transaction_hash, cid } = data;

    return {
      success: true,
      message: `NFT minted successfully. tx: ${transaction_hash}, cid: ${cid}`,
    };
  }
}
