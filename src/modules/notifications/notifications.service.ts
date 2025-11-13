import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirebaseService } from '../firebase/firebase.service';
import { User } from '../users/entities/user.entity';
import { AddPushTokenRequestDto, CreateNotificationDto } from './dto';
import { NotificationQueryDto } from './dto/notification.queries.dto';
import { PushNotificationRequestDto } from './dto/push-notification-request.dto';
import { Notifications, PushToken } from './entities';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(
    private readonly firebaseService: FirebaseService,
    @InjectRepository(Notifications)
    private readonly notificationRepository: Repository<Notifications>,
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
        tokenValue: addPushTokenForUser.token_value,
      },
    });

    if (existedToken) {
      this.logger.log('Token Existed');
      return existedToken;
    }

    this.logger.log('Adding new token...');
    const newToken = this.pushTokenRepository.create({
      accountId: account_id,
      tokenValue: addPushTokenForUser.token_value,
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

    const tokens = user.pushTokens.map((token) => token.tokenValue);

    if (tokens.length === 0) return;

    this.logger.log('Notify user to mobile device...');
    return this.firebaseService.pushNotification({
      tokens: tokens,
      notification: {
        title: pushNotificationRequestDto.title,
        body: pushNotificationRequestDto.body,
        imageUrl: pushNotificationRequestDto.url ?? undefined,
      },
    });
  }

  async getNotificationsByUserId(
    userId: string,
    notificationQueryDto: NotificationQueryDto,
  ) {
    this.logger.log(`Get notifications for user: ${userId}`);
    const page = notificationQueryDto.page || 1;
    const limit = notificationQueryDto.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.notificationRepository.createQueryBuilder('notification');

    queryBuilder.where('notification.account_id = :account_id', {
      account_id: userId,
    });

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit);

    queryBuilder.orderBy('notification.created_at', 'DESC');

    const notifications = await queryBuilder.getMany();

    return {
      success: true,
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async createNotification(createNotificationDto: CreateNotificationDto) {
    this.logger.log(
      `Create notification for user: ${createNotificationDto.account_id}`,
    );
    const newNotify = this.notificationRepository.create({
      accountId: createNotificationDto.account_id,
      message: createNotificationDto.message,
    });

    const result = await this.notificationRepository.save(newNotify);
    return result;
  }

  async updateNotificationReadStatus(notification_id: number) {
    this.logger.log(`Update read status for notification: ${notification_id}`);
    const notification = await this.notificationRepository.findOne({
      where: {
        notificationId: notification_id,
      },
    });

    if (!notification) throw new BadRequestException('Notification not found');

    notification.isRead = !notification.isRead;
    return this.notificationRepository.save(notification);
  }
}
