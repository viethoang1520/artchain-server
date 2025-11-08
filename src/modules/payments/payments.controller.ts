import { BadRequestException, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm/repository/Repository';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly paymentsService: PaymentsService
  ) { }
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const payload = req.body;
      console.log('Received webhook payload:', payload);
      // Xử lí khi thành công
      await this.paymentsService.handleWebhook(payload);
      

      // ====================
      return res.json();
    } catch (error) {
      throw new BadRequestException('Error handling webhook');
    }
  }
}
