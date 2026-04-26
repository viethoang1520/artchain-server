import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import {
  Transaction,
  TransactionStatus,
} from '../payments/entities/transaction.entity';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
import { ApproveWithdrawRequestDto } from './dto/approve-withdraw-request.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateWithdrawRequestDto } from './dto/create-withdraw-request.dto';
import { QueryWithdrawRequestDto } from './dto/query-withdraw-request.dto';
import { RejectWithdrawRequestDto } from './dto/reject-withdraw-request.dto';
import { TransactionHistoryQueryDto } from './dto/transaction-history-query.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import {
  Wallet,
  BankAccount,
  BankAccountStatus,
  WalletWithdrawRequest,
  WalletWithdrawRequestStatus,
} from './entities';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(WalletWithdrawRequest)
    private readonly withdrawRequestsRepository: Repository<WalletWithdrawRequest>,
    @InjectRepository(BankAccount)
    private readonly bankAccountsRepository: Repository<BankAccount>,
    private readonly usersService: UsersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private resolveWalletImpact(
    transaction: Transaction,
  ): 'CREDIT' | 'DEBIT' | 'NONE' {
    const note = (transaction.note || '').toUpperCase();

    if (note.includes('NAP TIEN VI')) {
      return transaction.status === TransactionStatus.SUCCESS
        ? 'CREDIT'
        : 'NONE';
    }

    if (note.includes('THANH TOAN DAU GIA TRANH')) {
      return transaction.status === TransactionStatus.SUCCESS
        ? 'DEBIT'
        : 'NONE';
    }

    if (
      note.includes('XỬ LÝ YÊU CẦU RÚT TIỀN') ||
      note.includes('XU LY YEU CAU RUT TIEN') ||
      note.includes('WITHDRAW_APPROVED #')
    ) {
      if (transaction.status === TransactionStatus.SUCCESS) {
        return 'DEBIT';
      }

      // Pending withdraw request means amount is being held from wallet balance.
      if (transaction.status === TransactionStatus.PENDING) {
        return 'DEBIT';
      }

      // Failed hold transaction itself does not change current wallet balance.
      return 'NONE';
    }

    return 'NONE';
  }

  private async ensureStaffUser(staffId: string) {
    const staff = await this.usersService.findUserById(staffId);

    if (!staff) {
      throw new NotFoundException('Không tìm thấy user staff');
    }

    if (staff.role !== UserRole.STAFF && staff.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xử lý yêu cầu rút tiền');
    }

    return staff;
  }

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
      await this.paymentsService.getTransactionsByUser(
        accountId,
        page,
        limit,
        whereCondition.status,
      );

    const monthlyStats =
      await this.paymentsService.getMonthlyWalletStats(accountId);

    const data = transactions.map((transaction) => {
      const walletImpact = this.resolveWalletImpact(transaction);
      const amount = Number(transaction.amount || 0);

      return {
        ...transaction,
        walletImpact,
        signedAmount:
          walletImpact === 'DEBIT'
            ? -amount
            : walletImpact === 'CREDIT'
              ? amount
              : 0,
      };
    });

    return {
      success: true,
      message: 'Lấy lịch sử giao dịch ví thành công',
      data,
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

  async createBankAccount(accountId: string, dto: CreateBankAccountDto) {
    const accountNumber = dto.accountNumber.trim();

    const existed = await this.bankAccountsRepository.findOne({
      where: {
        accountId,
        accountNumber,
        status: BankAccountStatus.ACTIVE,
      },
    });

    if (existed) {
      throw new ConflictException('Tài khoản ngân hàng này đã tồn tại');
    }

    const bankAccount = this.bankAccountsRepository.create({
      accountId,
      bankName: dto.bankName.trim(),
      accountNumber,
      accountHolderName: dto.accountHolderName.trim(),
      status: BankAccountStatus.ACTIVE,
    });

    const saved = await this.bankAccountsRepository.save(bankAccount);

    return {
      success: true,
      message: 'Thêm tài khoản ngân hàng thành công',
      data: saved,
    };
  }

  async getMyBankAccounts(accountId: string) {
    const data = await this.bankAccountsRepository.find({
      where: { accountId, status: BankAccountStatus.ACTIVE },
      order: { bankAccountId: 'DESC' },
    });

    return {
      success: true,
      message: 'Lấy danh sách tài khoản ngân hàng thành công',
      data,
    };
  }

  async softDeleteMyBankAccount(accountId: string, bankAccountId: string) {
    const bankAccount = await this.bankAccountsRepository.findOne({
      where: {
        bankAccountId,
        accountId,
        status: BankAccountStatus.ACTIVE,
      },
    });

    if (!bankAccount || bankAccount.status !== BankAccountStatus.ACTIVE) {
      throw new NotFoundException('Không tìm thấy tài khoản ngân hàng để xóa');
    }

    bankAccount.status = BankAccountStatus.INACTIVE;
    const updated = await this.bankAccountsRepository.save(bankAccount);

    return {
      success: true,
      message: 'Xóa tài khoản ngân hàng thành công',
      data: updated,
    };
  }

  async createWithdrawRequest(
    accountId: string,
    createWithdrawRequestDto: CreateWithdrawRequestDto,
  ) {
    const { amount, accountId: requestAccountId } = createWithdrawRequestDto;

    if (requestAccountId !== accountId) {
      throw new ForbiddenException(
        'Bạn không thể gửi yêu cầu rút tiền cho tài khoản khác',
      );
    }

    if (amount <= 0) {
      throw new BadRequestException('Số tiền rút phải lớn hơn 0');
    }

    return this.walletsRepository.manager.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const bankAccountRepo = manager.getRepository(BankAccount);
      const requestRepo = manager.getRepository(WalletWithdrawRequest);

      const wallet = await walletRepo
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.account_id = :accountId', { accountId })
        .getOne();

      if (!wallet) {
        throw new NotFoundException('Không tìm thấy ví của người dùng');
      }
      const requested = await requestRepo.find({
        where: {
          accountId,
          status: WalletWithdrawRequestStatus.PENDING,
        },
      });
      if (requested.length > 0) {
        throw new BadRequestException(
          'Bạn đã có một yêu cầu rút tiền đang chờ xử lý. Vui lòng đợi cho đến khi yêu cầu đó được xử lý trước khi gửi yêu cầu mới.',
        );
      }

      const bankAccount = await bankAccountRepo.findOne({
        where: {
          accountId: requestAccountId,
          status: BankAccountStatus.ACTIVE,
        },
      });

      if (!bankAccount) {
        throw new NotFoundException(
          'Không tìm thấy tài khoản ngân hàng hợp lệ để rút tiền',
        );
      }

      const currentBalance = Number(wallet.balance);
      if (currentBalance < Number(amount)) {
        throw new BadRequestException('Số dư không đủ để gửi yêu cầu rút tiền');
      }

      wallet.balance = Number((currentBalance - Number(amount)).toFixed(2));
      await walletRepo.save(wallet);

      const request = requestRepo.create({
        accountId,
        walletId: wallet.walletId,
        bankAccountId: bankAccount.bankAccountId,
        amount: Number(amount),
        status: WalletWithdrawRequestStatus.PENDING,
        bankName: bankAccount.bankName,
        recipientBankAccountName: bankAccount.accountHolderName,
        recipientBankAccountNumber: bankAccount.accountNumber,
      });

      const savedRequest = await requestRepo.save(request);

      return {
        success: true,
        message: 'Đã gửi yêu cầu rút tiền thành công',
        data: savedRequest,
        wallet: {
          walletId: wallet.walletId,
          balance: wallet.balance,
        },
      };
    });
  }

  async getMyWithdrawRequests(
    accountId: string,
    queryDto: QueryWithdrawRequestDto,
  ) {
    const { page = 1, limit = 10, status } = queryDto;

    const whereCondition: {
      accountId: string;
      status?: WalletWithdrawRequestStatus;
    } = {
      accountId,
    };

    if (status) {
      whereCondition.status = status;
    }

    const [requests, total] =
      await this.withdrawRequestsRepository.findAndCount({
        where: whereCondition,
        relations: ['account'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      success: true,
      message: 'Lấy danh sách yêu cầu rút tiền thành công',
      data: requests.map((item) => ({
        ...item,
        user: item.account
          ? {
              userId: item.account.userId,
              fullName: item.account.fullName,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWithdrawRequestsForStaff(
    staffId: string,
    queryDto: QueryWithdrawRequestDto,
  ) {
    await this.ensureStaffUser(staffId);

    const { page = 1, limit = 10, status } = queryDto;
    const whereCondition: { status?: WalletWithdrawRequestStatus } = {};

    if (status) {
      whereCondition.status = status;
    }

    const [requests, total] =
      await this.withdrawRequestsRepository.findAndCount({
        where: whereCondition,
        relations: ['account'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      success: true,
      message: 'Lấy danh sách yêu cầu rút tiền thành công',
      data: requests.map((item) => ({
        ...item,
        user: item.account
          ? {
              userId: item.account.userId,
              fullName: item.account.fullName,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveWithdrawRequest(
    staffId: string,
    requestId: string,
    approveDto: ApproveWithdrawRequestDto,
  ) {
    await this.ensureStaffUser(staffId);

    return this.walletsRepository.manager.transaction(async (manager) => {
      const requestRepo = manager.getRepository(WalletWithdrawRequest);
      const transactionRepo = manager.getRepository(Transaction);

      const request = await requestRepo
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.request_id = :requestId', { requestId })
        .getOne();

      if (!request) {
        throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
      }

      if (request.status !== WalletWithdrawRequestStatus.PENDING) {
        throw new BadRequestException(
          'Yêu cầu rút tiền đã được xử lý trước đó',
        );
      }

      request.status = WalletWithdrawRequestStatus.APPROVED;
      request.proofImageUrl = approveDto.proofImageUrl || null;
      request.staffNote = approveDto.staffNote || null;
      request.processedBy = staffId;
      request.processedAt = new Date();
      const savedRequest = await requestRepo.save(request);

      const holdTransaction = await transactionRepo.findOne({
        where: {
          userId: request.accountId,
          status: TransactionStatus.PENDING,
          note: `Xử lý yêu cầu rút tiền #${requestId}`,
        },
      });

      if (holdTransaction) {
        holdTransaction.status = TransactionStatus.SUCCESS;
        holdTransaction.note = `WITHDRAW_APPROVED #${requestId}`;
        holdTransaction.paymentDate = new Date();
        await transactionRepo.save(holdTransaction);
      } else {
        const fallbackTransaction = transactionRepo.create({
          userId: request.accountId,
          amount: Number(request.amount),
          status: TransactionStatus.SUCCESS,
          paymentDate: new Date(),
          note: `WITHDRAW_APPROVED #${requestId}`,
        });
        await transactionRepo.save(fallbackTransaction);
      }

      return {
        success: true,
        message: 'Duyệt yêu cầu rút tiền thành công',
        data: savedRequest,
      };
    });
  }

  async rejectWithdrawRequest(
    staffId: string,
    requestId: string,
    rejectDto: RejectWithdrawRequestDto,
  ) {
    await this.ensureStaffUser(staffId);

    return this.walletsRepository.manager.transaction(async (manager) => {
      const requestRepo = manager.getRepository(WalletWithdrawRequest);
      const walletRepo = manager.getRepository(Wallet);
      const transactionRepo = manager.getRepository(Transaction);

      const request = await requestRepo
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.request_id = :requestId', { requestId })
        .getOne();

      if (!request) {
        throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
      }

      if (request.status !== WalletWithdrawRequestStatus.PENDING) {
        throw new BadRequestException(
          'Yêu cầu rút tiền đã được xử lý trước đó',
        );
      }

      const wallet = await walletRepo
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.wallet_id = :walletId', { walletId: request.walletId })
        .getOne();

      if (!wallet) {
        throw new NotFoundException('Không tìm thấy ví để hoàn tiền');
      }

      wallet.balance = Number(
        (Number(wallet.balance) + Number(request.amount)).toFixed(2),
      );
      await walletRepo.save(wallet);

      request.status = WalletWithdrawRequestStatus.REJECTED;
      request.rejectReason = rejectDto.rejectReason;
      request.staffNote = rejectDto.staffNote || null;
      request.processedBy = staffId;
      request.processedAt = new Date();
      const savedRequest = await requestRepo.save(request);

      const holdTransaction = await transactionRepo.findOne({
        where: {
          userId: request.accountId,
          status: TransactionStatus.PENDING,
          note: `Xử lý yêu cầu rút tiền #${requestId}`,
        },
      });

      if (holdTransaction) {
        holdTransaction.status = TransactionStatus.FAILED;
        holdTransaction.note = `WITHDRAW_REJECTED #${requestId}`;
        holdTransaction.paymentDate = new Date();
        await transactionRepo.save(holdTransaction);
      }

      return {
        success: true,
        message: 'Đã từ chối yêu cầu rút tiền và hoàn tiền về ví',
        data: savedRequest,
        wallet: {
          walletId: wallet.walletId,
          balance: wallet.balance,
        },
      };
    });
  }
}
