import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WalletsService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { TransactionHistoryQueryDto } from './dto/transaction-history-query.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';

@ApiTags('Wallets')
@Controller('api/wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post('/create')
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  createWallet(@Body() createWalletDto: CreateWalletDto) {
    return this.walletsService.createWallet(createWalletDto);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw a specific amount from wallet' })
  @ApiResponse({ status: 201, description: 'Withdraw successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  withdraw(@Body() withdrawWalletDto: WithdrawWalletDto) {
    return this.walletsService.withdraw(withdrawWalletDto);
  }

  @Get(':accountId/transactions')
  @ApiOperation({ summary: 'Get wallet transaction history by account ID' })
  @ApiParam({
    name: 'accountId',
    description: 'User account ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  getTransactionHistory(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() queryDto: TransactionHistoryQueryDto,
  ) {
    return this.walletsService.getTransactionHistoryByAccountId(
      accountId,
      queryDto,
    );
  }
}
