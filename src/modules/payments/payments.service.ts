import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Sponsor, SponsorStatus } from '../sponsors/entities/sponsor.entity';
import PayOS from '../../common/config/payos.config';
import { Order, OrderStatus } from './entities/order.entity';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class PaymentsService {
  constructor(
    private dataSource: DataSource,
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
  async createPayment(sponsorId: number, totalAmount: number, campaignId: number): Promise<{ checkoutUrl: string, qrCode: string, order: any }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const orderCode = Number(String(new Date().getTime()).slice(-6))

      // bấm vào nút thanh toán -> tạo mới sponsor (api khác) + transaction + update tiền campaign
      const campaign = await queryRunner.manager.findOne(Campaign, {
        where: { campaignId },
      });
      if (!campaign || campaign.deadline < new Date()) {
        throw new Error('Campaign not found or expired');
      }
      const newTransaction = queryRunner.manager.create(Transaction, {
        sponsorId,
        campaignId,
        amount: totalAmount,
        status: TransactionStatus.PENDING,
      });
      const savedTransaction = await queryRunner.manager.save(newTransaction);

      // // update tiền cho campaign
      // campaign.currentAmount += Number(totalAmount);
      // await queryRunner.manager.save(campaign);
      // tạo order object truyền vào PayOS
      const order = {
        orderCode: orderCode,
        amount: parseFloat(totalAmount.toString()),
        description: `THANH TOAN TAI TRO ${orderCode}`,
        returnUrl: `${this.configService.get('CLIENT_URL')}/payment/success`,
        cancelUrl: `${this.configService.get('CLIENT_URL')}/payment/cancel`,
      }
      const paymentLink = await PayOS.paymentRequests.create(order);
      const createdOrder = await this.createNewOrder(
        sponsorId,
        orderCode,
        totalAmount,
        savedTransaction.transactionId,
        queryRunner.manager
      );
      await queryRunner.commitTransaction();
      return {
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
        order: createdOrder
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createNewOrder(sponsorId: number, orderCode: number, totalAmount: number, transactionId: string, manager: EntityManager) {
    const newOrder = manager.create(Order, {
      sponsorId,
      orderCode,
      amount: totalAmount,
      description: `THANH TOAN TAI TRO ${orderCode}`,
      returnUrl: `${process.env.CLIENT_URL}/payment/success`,
      cancelUrl: `${process.env.CLIENT_URL}/payment/cancel`,
      transactionId,
    });
    return await manager.save(newOrder);
  }

  async handleWebhook(payload: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {

      const { code, desc, data } = payload;
      const order = await queryRunner.manager.findOne(Order, {
        where: { orderCode: data.orderCode },
      });
      if (!order) throw new Error('Order not found');

      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { transactionId: order.transactionId },
      });
      if (!transaction) throw new Error('Transaction not found');

      const sponsor = await queryRunner.manager.findOne(Sponsor, {
        where: { sponsorId: order.sponsorId },
      });

      if (code === '00' && sponsor) {
        order.status = OrderStatus.COMPLETED;
        transaction.status = TransactionStatus.SUCCESS;
        sponsor.status = SponsorStatus.PAID;
      } else {
        order.status = OrderStatus.CANCELLED;
        transaction.status = TransactionStatus.FAILED;
      }

      await queryRunner.manager.save(order);
      await queryRunner.manager.save(transaction);
      if (sponsor) {
        await queryRunner.manager.save(sponsor);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}