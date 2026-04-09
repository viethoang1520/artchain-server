import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  Transaction,
  TransactionStatus,
} from '../payments/entities/transaction.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { TransactionHistoryQueryDto } from './dto/transaction-history-query.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { Wallet } from './entities';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async createWallet(createWalletDto: CreateWalletDto) {
    const { accountId } = createWalletDto;

    const savedWallet = await this.walletsRepository.manager.transaction(
      async (transactionManager) => {
        const userRepository = transactionManager.getRepository(User);
        const walletRepository = transactionManager.getRepository(Wallet);

        const user = await userRepository.findOne({
          where: { userId: accountId },
        });

        if (!user) {
          throw new NotFoundException(`User with ID ${accountId} not found`);
        }

        if (user.walletId) {
          throw new ConflictException(`User ${accountId} already has a wallet`);
        }

        const existingWallet = await walletRepository.findOne({
          where: { accountId },
        });

        if (existingWallet) {
          throw new ConflictException(
            `Wallet already exists for user ${accountId}`,
          );
        }

        const wallet = walletRepository.create({
          accountId,
          balance: 0,
          user,
        });

        const createdWallet = await walletRepository.save(wallet);

        user.walletId = createdWallet.walletId;
        await userRepository.save(user);

        return createdWallet;
      },
    );

    return {
      success: true,
      message: 'Tạo ví thành công',
      data: savedWallet,
    };
  }

  async withdraw(withdrawWalletDto: WithdrawWalletDto) {
    const { accountId, amount } = withdrawWalletDto;

    if (amount <= 0) {
      throw new BadRequestException('Số tiền rút phải lớn hơn 0');
    }

    const updatedWallet = await this.walletsRepository.manager.transaction(
      async (transactionManager) => {
        const walletRepository = transactionManager.getRepository(Wallet);

        const wallet = await walletRepository
          .createQueryBuilder('wallet')
          .setLock('pessimistic_write')
          .where('wallet.account_id = :accountId', { accountId })
          .getOne();

        if (!wallet) {
          throw new NotFoundException(`Wallet for user ${accountId} not found`);
        }

        const currentBalance = Number(wallet.balance);
        const withdrawAmount = Number(amount);

        if (currentBalance < withdrawAmount) {
          throw new BadRequestException(
            'Số dư không đủ để thực hiện giao dịch',
          );
        }

        wallet.balance = Number((currentBalance - withdrawAmount).toFixed(2));

        return walletRepository.save(wallet);
      },
    );

    return {
      success: true,
      message: 'Rút tiền thành công',
      data: updatedWallet,
    };
  }

  async getTransactionHistoryByAccountId(
    accountId: string,
    queryDto: TransactionHistoryQueryDto,
  ) {
    const { page = 1, limit = 10, status } = queryDto;

    const wallet = await this.walletsRepository.findOne({
      where: { accountId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet for user ${accountId} not found`);
    }

    const whereCondition: { userId: string; status?: TransactionStatus } = {
      userId: accountId,
    };

    if (status) {
      whereCondition.status = status;
    }

    const [transactions, total] =
      await this.transactionsRepository.findAndCount({
        where: whereCondition,
        order: { paymentDate: 'DESC', createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthlyStats = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select(
        `COALESCE(SUM(CASE WHEN transaction.note ILIKE 'NAP TIEN VI%' THEN transaction.amount ELSE 0 END), 0)`,
        'totalTopupThisMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN transaction.note ILIKE 'Thanh toan dau gia tranh #%'
          OR transaction.note ILIKE 'RUT TIEN VI%'
          THEN transaction.amount ELSE 0 END), 0)`,
        'totalSpendThisMonth',
      )
      .where('transaction.userId = :accountId', { accountId })
      .andWhere('transaction.status = :successStatus', {
        successStatus: TransactionStatus.SUCCESS,
      })
      .andWhere('transaction.paymentDate >= :monthStart', { monthStart })
      .andWhere('transaction.paymentDate < :nextMonthStart', {
        nextMonthStart,
      })
      .getRawOne<{
        totalTopupThisMonth: string;
        totalSpendThisMonth: string;
      }>();

    return {
      success: true,
      message: 'Lấy lịch sử giao dịch ví thành công',
      data: transactions,
      summary: {
        totalTopupThisMonth: Number(monthlyStats?.totalTopupThisMonth ?? 0),
        totalSpendThisMonth: Number(monthlyStats?.totalSpendThisMonth ?? 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
