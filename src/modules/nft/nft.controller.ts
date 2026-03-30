import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NftService } from './nft.service';
import { MintNftDto } from './dto/mint-nft.dto';

@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Post('/mint-nft')
  mintNFT(@Body() mintNftDto: MintNftDto) {
    return this.nftService.mint(mintNftDto);
  }
}
