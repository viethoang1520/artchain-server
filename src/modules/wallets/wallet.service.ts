import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
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

    const user = await this.usersRepository.findOne({
      where: { userId: accountId as unknown as string },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${accountId} not found`);
    }

    const existingWallet = await this.walletsRepository.findOne({
      where: { accountId: accountId as unknown as string },
    });

    if (existingWallet) {
      throw new ConflictException(
        `Wallet already exists for user ${accountId}`,
      );
    }

    const wallet = this.walletsRepository.create({
      accountId: accountId as unknown as string,
      balance: 0,
      user,
    });

    const savedWallet = await this.walletsRepository.save(wallet);

    return {
      success: true,
      message: 'Tạo ví thành công',
      data: savedWallet,
    };
  }
}