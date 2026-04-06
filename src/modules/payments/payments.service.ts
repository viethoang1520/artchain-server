import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { Repository } from 'typeorm/repository/Repository';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Sponsor, SponsorStatus } from '../sponsors/entities/sponsor.entity';
import PayOS from '../../common/config/payos.config';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { Wallet } from '../wallets/entities';

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
      const createdOrder = await this.createNewOrder(
        {
          sponsorId,
          orderType: OrderType.SPONSOR,
        },
        orderCode,
        totalAmount,
        `THANH TOAN TAI TRO ${orderCode}`,
        savedTransaction.transactionId,
        queryRunner.manager
      );
      await queryRunner.commitTransaction();
      const paymentLink = await PayOS.paymentRequests.create(order);
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

  async createWalletTopupPayment(
    walletId: string,
    userId: string,
    totalAmount: number,
  ): Promise<{ checkoutUrl: string, qrCode: string, order: any }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const orderCode = Number(String(new Date().getTime()).slice(-6));
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { walletId },
      });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const description = `NAP TIEN VI ${orderCode}`;
      const newTransaction = queryRunner.manager.create(Transaction, {
        userId,
        amount: totalAmount,
        status: TransactionStatus.PENDING,
        note: description,
      });
      const savedTransaction = await queryRunner.manager.save(newTransaction);

      const order = {
        orderCode,
        amount: parseFloat(totalAmount.toString()),
        description,
        returnUrl: `${this.configService.get('CLIENT_URL')}/payment/success`,
        cancelUrl: `${this.configService.get('CLIENT_URL')}/payment/cancel`,
      };

      const createdOrder = await this.createNewOrder(
        {
          walletId,
          orderType: OrderType.WALLET_TOPUP,
        },
        orderCode,
        totalAmount,
        description,
        savedTransaction.transactionId,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      const paymentLink = await PayOS.paymentRequests.create(order);
      return {
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
        order: createdOrder,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createNewOrder(
    orderRef: { sponsorId?: number; walletId?: string; orderType: OrderType },
    orderCode: number,
    totalAmount: number,
    description: string,
    transactionId: string,
    manager: EntityManager,
  ) {
    const newOrder = manager.create(Order, {
      sponsorId: orderRef.sponsorId,
      walletId: orderRef.walletId,
      orderType: orderRef.orderType,
      orderCode,
      amount: totalAmount,
      description,
      returnUrl: `${this.configService.get('CLIENT_URL')}/payment/success`,
      cancelUrl: `${this.configService.get('CLIENT_URL')}/payment/cancel`,
      transactionId,
    });
    return await manager.save(newOrder);
  }

  async handleWebhook(payload: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { code, data } = payload;
      const order = await queryRunner.manager.findOne(Order, {
        where: { orderCode: data.orderCode },
      });
      if (!order) throw new Error('Order not found');

      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { transactionId: order.transactionId },
      });
      if (!transaction) throw new Error('Transaction not found');

      const sponsor =
        order.orderType === OrderType.SPONSOR && order.sponsorId
          ? await queryRunner.manager.findOne(Sponsor, {
            where: { sponsorId: order.sponsorId },
          })
          : null;

      const wallet =
        order.orderType === OrderType.WALLET_TOPUP && order.walletId
          ? await queryRunner.manager.findOne(Wallet, {
            where: { walletId: order.walletId },
          })
          : null;

      if (order.status === OrderStatus.COMPLETED) {
        await queryRunner.commitTransaction();
        return;
      }

      if (code === '00') {
        if (transaction.status !== TransactionStatus.PENDING) {
          await queryRunner.commitTransaction();
          return;
        }

        transaction.status = TransactionStatus.SUCCESS;
        order.status = OrderStatus.COMPLETED;

        if (order.orderType === OrderType.SPONSOR) {
          if (!sponsor) {
            throw new Error('Sponsor not found for sponsor order');
          }
          sponsor.status = SponsorStatus.PAID;
        }

        if (order.orderType === OrderType.WALLET_TOPUP) {
          if (!wallet) {
            throw new Error('Wallet not found for wallet top-up order');
          }
          wallet.balance = Number(wallet.balance) + Number(order.amount);
        }
      } else {
        order.status = OrderStatus.CANCELLED;
        transaction.status = TransactionStatus.FAILED;
      }

      await queryRunner.manager.save(order);
      await queryRunner.manager.save(transaction);
      if (sponsor) {
        await queryRunner.manager.save(sponsor);
      }
      if (wallet) {
        await queryRunner.manager.save(wallet);
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