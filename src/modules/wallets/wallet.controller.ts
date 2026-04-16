import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletsService } from './wallet.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateWithdrawRequestDto } from './dto/create-withdraw-request.dto';
import { QueryWithdrawRequestDto } from './dto/query-withdraw-request.dto';
import { TransactionHistoryQueryDto } from './dto/transaction-history-query.dto';

@ApiTags('Wallets')
@ApiBearerAuth()
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

  // @Post('withdraw')
  // @ApiOperation({ summary: 'Withdraw a specific amount from wallet' })
  // @ApiResponse({ status: 201, description: 'Withdraw successfully' })
  // @ApiResponse({ status: 400, description: 'Bad Request' })
  // withdraw(@Body() withdrawWalletDto: WithdrawWalletDto) {
  //   return this.walletsService.withdraw(withdrawWalletDto);
  // }

  @Post('withdraw-requests')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'User gửi yêu cầu rút tiền' })
  @ApiResponse({ status: 201, description: 'Gửi yêu cầu rút tiền thành công' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc số dư không đủ',
  })
  createWithdrawRequest(
    @Req() req: any,
    @Body() createWithdrawRequestDto: CreateWithdrawRequestDto,
  ) {
    const userId = req.user.sub;
    return this.walletsService.createWithdrawRequest(
      userId,
      createWithdrawRequestDto,
    );
  }

  @Post('bank-accounts')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'User thêm tài khoản ngân hàng' })
  @ApiResponse({
    status: 201,
    description: 'Thêm tài khoản ngân hàng thành công',
  })
  createBankAccount(
    @Req() req: any,
    @Body() createBankAccountDto: CreateBankAccountDto,
  ) {
    const userId = req.user.sub;
    return this.walletsService.createBankAccount(userId, createBankAccountDto);
  }

  @Get('bank-accounts/me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'User xem danh sách tài khoản ngân hàng của mình' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getMyBankAccounts(@Req() req: any) {
    const userId = req.user.sub;
    return this.walletsService.getMyBankAccounts(userId);
  }

  @Get('withdraw-requests/me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'User xem danh sách yêu cầu rút tiền của mình' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getMyWithdrawRequests(
    @Req() req: any,
    @Query() queryDto: QueryWithdrawRequestDto,
  ) {
    const userId = req.user.sub;
    return this.walletsService.getMyWithdrawRequests(userId, queryDto);
  }

  @Get(':accountId/transactions')
  @ApiOperation({ summary: 'Get wallet transaction history by account ID' })
  @ApiParam({
    name: 'accountId',
    description: 'User account ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Lịch sử giao dịch được lấy thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ví' })
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
