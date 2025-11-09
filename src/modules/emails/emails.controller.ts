import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { MailOptionsDto } from './dto/mail-options.dto';
import { ContestNotificationDto } from './dto/contest-notification.dto';
import { WinnerAnnouncementDto } from './dto/winner-announcement.dto';

@ApiTags('Emails')
@Controller('api/emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) { }

  @Post('')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a custom email', description: 'Send a custom email with specified options' })
  @ApiBody({ type: MailOptionsDto })
  @ApiResponse({ status: 200, description: 'Email sent successfully', schema: { example: { message: 'Email sent successfully' } } })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendEmail(@Body() mailOptionsDto: MailOptionsDto): Promise<{ message: string }> {
    await this.emailsService.sendMail(mailOptionsDto);
    return { message: 'Email sent successfully' };
  }

  @Post('notify-contest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send contest notification', description: 'Send notification email about new active contest to a recipient' })
  @ApiBody({ type: ContestNotificationDto })
  @ApiResponse({ status: 200, description: 'Contest notification sent successfully', schema: { example: { message: 'Contest notification sent successfully' } } })
  @ApiResponse({ status: 400, description: 'Invalid email address' })
  @ApiResponse({ status: 404, description: 'No active contest found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async notifyContest(): Promise<{ message: string }> {
    await this.emailsService.sendNotificationForNewContest();
    return { message: 'Contest notification sent successfully' };
  }

  @Post('announce-winners')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send winner announcements', description: 'Send winner announcement emails to multiple recipients for a specific contest' })
  @ApiBody({ type: WinnerAnnouncementDto })
  @ApiResponse({ status: 200, description: 'Winner announcements sent successfully', schema: { example: { message: 'Winner announcements sent successfully' } } })
  @ApiResponse({ status: 400, description: 'Invalid input data or email addresses' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async announceWinners(@Body() winnerAnnouncementDto: WinnerAnnouncementDto): Promise<{ message: string }> {
    await this.emailsService.sendWinnerAnnouncement(winnerAnnouncementDto.contestName, winnerAnnouncementDto.winnerEmails);
    return { message: 'Winner announcements sent successfully' };
  }
}
