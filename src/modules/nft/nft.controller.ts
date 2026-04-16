import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NftService } from './nft.service';
import { MintNftDto } from './dto/mint-nft.dto';

@Controller('/api/nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Post('/mint')
  mintNFT(@Body() mintNftDto: MintNftDto) {
    try {
      return this.nftService.mint(mintNftDto);
    } catch (error) {
      console.log('error: ', error);
    }
    
  }
}
