import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WhoAmI } from '../auth/decorator/who-am-i.decorator';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddPushTokenRequestDto, CreateNotificationDto } from './dto';
import { NotificationQueryDto } from './dto/notification.queries.dto';
import { PushNotificationRequestDto } from './dto/push-notification-request.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('/api/notifications')
export class NotificationsController {
  constructor(private notificationService: NotificationsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a push token for the authenticated user' })
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
  @ApiOperation({ summary: 'Push notification to the authenticated user' })
  @UseGuards(AuthGuard)
  @Post('/tokens/push')
  @ApiResponse({
    status: 201,
    description: 'Push notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        tokenId: { type: 'number', example: 1 },
        accountId: { type: 'string', example: 'user-uuid' },
        tokenValue: { type: 'string', example: 'fcm-token-value' },
        createdAt: { type: 'string', example: '2025-10-31T00:00:00Z' },
      },
    },
  })
  async pushNotification(
    @WhoAmI('sub') sub: string,
    @Body() pushNotificationRequestDto: PushNotificationRequestDto,
  ) {
    return this.notificationService.pushNotificationForUser(sub, {
      title: pushNotificationRequestDto.title,
      body: pushNotificationRequestDto.body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get notifications for the authenticated user' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiResponse({
    status: 200,
    description: 'List of notifications for the user',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              notificationId: { type: 'number', example: 1 },
              accountId: { type: 'string', example: 'user-uuid' },
              message: {
                type: 'string',
                example: 'Your order has been shipped.',
              },
              isRead: { type: 'boolean', example: false },
              createdAt: { type: 'string', example: '2025-10-31T00:00:00Z' },
              updatedAt: { type: 'string', example: '2025-10-31T00:00:00Z' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 50 },
            totalPages: { type: 'number', example: 5 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  async getNotificationsByUserId(
    @WhoAmI('sub') sub: string,
    @Query() notificationQueryDto: NotificationQueryDto,
  ) {
    return this.notificationService.getNotificationsByUserId(
      sub,
      notificationQueryDto,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    schema: {
      type: 'object',
      properties: {
        notificationId: { type: 'number', example: 1 },
        accountId: { type: 'string', example: 'user-uuid' },
        message: { type: 'string', example: 'Your order has been shipped.' },
        isRead: { type: 'boolean', example: false },
        createdAt: { type: 'string', example: '2025-10-31T00:00:00Z' },
        updatedAt: { type: 'string', example: '2025-10-31T00:00:00Z' },
      },
    },
  })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationService.createNotification(createNotificationDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification read status' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Notification read status updated',
    schema: {
      type: 'object',
      properties: {
        notificationId: { type: 'number', example: 1 },
        accountId: { type: 'string', example: 'user-uuid' },
        message: { type: 'string', example: 'Your order has been shipped.' },
        isRead: { type: 'boolean', example: true },
        createdAt: { type: 'string', example: '2025-10-31T00:00:00Z' },
        updatedAt: { type: 'string', example: '2025-10-31T00:00:00Z' },
      },
    },
  })
  async updateNotificationReadStatus(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.updateNotificationReadStatus(id);
  }
}
