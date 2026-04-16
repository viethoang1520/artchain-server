import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm/repository/Repository';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateWalletTopupPaymentDto } from './dto/create-wallet-topup-payment.dto';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentsController {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('wallet/topup')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo thanh toán nạp tiền vào ví của user hiện tại' })
  @ApiBody({ type: CreateWalletTopupPaymentDto })
  @ApiResponse({ status: 201, description: 'Tạo link thanh toán thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ví của user' })
  async createWalletTopupPayment(
    @Req() req: any,
    @Body() body: CreateWalletTopupPaymentDto,
  ) {
    const userId = req.user.sub;
    const { amount } = body;

    return this.paymentsService.createWalletTopupPaymentByUser(userId, amount);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const payload = req.body;
      console.log('Received webhook payload:', payload);
      // Xử lí khi thành công
      if (payload?.data?.orderCode == "123") {
        return res.json();
      }
      await this.paymentsService.handleWebhook(payload);

      return res.json();

      // ====================
    } catch (error) {
      throw new BadRequestException('Error handling webhook');
    }
  }
}
