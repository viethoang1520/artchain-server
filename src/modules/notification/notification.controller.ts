import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { WhoAmI } from '../auth/decorator/who-am-i.decorator';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { AddPushTokenRequestDto } from './dto';
import { PushNotificationRequestDto } from './dto/push-notification-request.dto';

@Controller('/api/notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('/tokens')
  async addPushTokenForUser(
    @WhoAmI('sub') sub: string,
    @Body() addPushTokenRequestDto: AddPushTokenRequestDto,
  ) {
    return this.notificationService.addPushTokenForUser(
      sub,
      addPushTokenRequestDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('/tokens/push')
  async pushNotification(
    @WhoAmI('sub') sub: string,
    @Body() pushNotificationRequestDto: PushNotificationRequestDto,
  ) {
    return this.notificationService.pushNotificationForUser(sub, {
      title: pushNotificationRequestDto.title,
      body: pushNotificationRequestDto.body,
    });
  }
}
