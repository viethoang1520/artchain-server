import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { Wallet } from './entities';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) { }

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
          throw new BadRequestException('Số dư không đủ để thực hiện giao dịch');
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

}