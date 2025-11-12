import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirebaseService } from '../firebase/firebase.service';
import { User } from '../users/entities/user.entity';
import { AddPushTokenRequestDto } from './dto';
import { PushNotificationRequestDto } from './dto/push-notification-request.dto';
import { PushToken } from './entities/push-token.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(
    private readonly firebaseService: FirebaseService,
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async addPushTokenForUser(
    account_id: string,
    addPushTokenForUser: AddPushTokenRequestDto,
  ) {
    const existedToken = await this.pushTokenRepository.findOne({
      where: {
        token_value: addPushTokenForUser.token_value,
      },
    });

    if (existedToken) {
      this.logger.log('Token Existed');
      return existedToken;
    }

    this.logger.log('Adding new token...');
    const newToken = this.pushTokenRepository.create({
      account_id: account_id,
      token_value: addPushTokenForUser.token_value,
    });

    const result = await this.pushTokenRepository.save(newToken);
    this.logger.log('Added');

    return result;
  }

  async pushNotificationForUser(
    userId: string,
    pushNotificationRequestDto: PushNotificationRequestDto,
  ) {
    const user = await this.userRepository.findOne({
      where: {
        userId: userId,
      },
      relations: { pushTokens: true },
    });

    if (!user) throw new BadRequestException('User not found');

    const tokens = user.pushTokens.map((token) => token.token_value);

    if (tokens.length === 0) return;

    this.logger.log('Notify user to mobile device...');
    return this.firebaseService.pushNotification({
      tokens: tokens,
      notification: {
        title: pushNotificationRequestDto.title,
        body: pushNotificationRequestDto.body,
        imageUrl:
          'https://firebasestorage.googleapis.com/v0/b/blood-donation-18260.firebasestorage.app/o/FCMImages%2FAiLert_small_logo_color_alpha-300x300.png?alt=media&token=a603b52b-7940-422e-baa5-93c800aa434a',
      },
    });
  }
}
