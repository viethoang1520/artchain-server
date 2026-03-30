import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { WalletsService } from "./wallet.service";
import { CreateWalletDto } from './dto/create-wallet.dto';

@ApiTags('Wallets')
@Controller('api/wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) { }

  @Post("create")
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  createWallet(@Body() createWalletDto: CreateWalletDto) {
    return this.walletsService.createWallet(createWalletDto);
  }
}