import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Sponsor, SponsorStatus } from '../sponsors/entities/sponsor.entity';
import PayOS from '../../common/config/payos.config';
import { Order, OrderStatus } from './entities/order.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Sponsor)
    private sponsorRepository: Repository<Sponsor>,
    private configService: ConfigService
  ) { }
  async createPayment(sponsorId: number, totalAmount: number, campaignId: number): Promise<{ checkoutUrl: string, qrCode: string, order:any }> {
    const orderCode = Number(String(new Date().getTime()).slice(-6))

    // bấm vào nút thanh toán -> tạo mới sponsor (api khác) + transaction + update tiền campaign
    const campaign = await this.campaignRepository.findOne({ where: { campaignId } });
    if (!campaign || campaign.deadline < new Date()) {
      throw new Error('Campaign not found or expired');
    }
    const newTransaction = new Transaction();
    newTransaction.sponsorId = sponsorId;
    newTransaction.campaignId = campaignId;
    newTransaction.amount = totalAmount;
    newTransaction.status = TransactionStatus.PENDING;
    const savedTransaction = await this.transactionRepository.save(newTransaction);

    // update tiền cho campaign
    campaign.currentAmount += Number(totalAmount);
    const abc = await this.campaignRepository.save(campaign);
    // tạo order object truyền vào PayOS
    const order = {
      orderCode: orderCode,
      amount: parseFloat(totalAmount.toString()),
      description: `THANH TOAN TAI TRO ${orderCode}`,
      returnUrl: `${this.configService.get('CLIENT_URL')}/payment/success`,
      cancelUrl: `${this.configService.get('CLIENT_URL')}/payment/cancel`,
    }
    const paymentLink = await PayOS.paymentRequests.create(order);
    const createdOrder = await this.createNewOrder(sponsorId, orderCode, totalAmount, savedTransaction.transactionId);
    return {
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      order: createdOrder
    }
  }

  async createNewOrder(sponsorId: number, orderCode: number, totalAmount: number, transactionId: string) {
    const newOrder = new Order();
    newOrder.sponsorId = sponsorId;
    newOrder.orderCode = orderCode;
    newOrder.amount = totalAmount;
    newOrder.description = `THANH TOAN TAI TRO ${orderCode}`;
    newOrder.returnUrl = `${process.env.CLIENT_URL}/payment/success`;
    newOrder.cancelUrl = `${process.env.CLIENT_URL}/payment/cancel`;
    newOrder.transactionId = transactionId;
    return await this.orderRepository.save(newOrder);
  }

  async handleWebhook(payload: any) {
    const { code, desc, data } = payload;
    const order = await this.orderRepository.findOne({ where: { orderCode: data.orderCode } });
    const transaction = await this.transactionRepository.findOne({ where: { transactionId: order?.transactionId } });
    const sponsor = await this.sponsorRepository.findOne({ where: { sponsorId: order?.sponsorId } });
    if (!order || !transaction ) {
      throw new Error('Order or Transaction not found');
    }
    if (code === '00' && sponsor) {
      order.status = OrderStatus.COMPLETED;
      transaction.status = TransactionStatus.SUCCESS;
      sponsor.status = SponsorStatus.PAID;
    } else {
      order.status = OrderStatus.CANCELLED;
      transaction.status = TransactionStatus.FAILED;
    }
    await this.orderRepository.save(order);
    await this.transactionRepository.save(transaction);

    if (sponsor) {
      await this.sponsorRepository.save(sponsor);
    }
  }
}