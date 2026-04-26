import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MailOptionsDto } from './dto/mail-options.dto';
import { WinnerAnnouncementDto } from './dto/winner-announcement.dto';
import { EmailsService } from './emails.service';

@ApiTags('Emails')
@Controller('api/emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post('')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a custom email',
    description: 'Send a custom email to multiple recipients',
  })
  @ApiBody({ type: MailOptionsDto })
  @ApiResponse({
    status: 200,
    description: 'Emails sent successfully to all recipients',
    schema: { example: { message: 'Email sent successfully' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or email addresses',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendEmail(
    @Body() mailOptionsDto: MailOptionsDto,
  ): Promise<{ message: string }> {
    this.emailsService.sendMail(mailOptionsDto);
    return { message: 'Email sent successfully' };
  }

  @Post('notify-contest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send contest notification to all competitors',
    description:
      'Send notification email about the latest active contest to all users with COMPETITOR role. No request body required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contest notifications sent successfully to all competitors',
    schema: { example: { message: 'Contest notification sent successfully' } },
  })
  @ApiResponse({
    status: 404,
    description: 'No active contest found or no competitors found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async notifyContest(): Promise<{ message: string }> {
    // this.emailsService.sendNotificationForNewContest();
    return { message: 'Contest notification sent successfully' };
  }

  @Post('announce-winners')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send winner announcements',
    description:
      'Send winner announcement emails to multiple recipients for a specific contest',
  })
  @ApiBody({ type: WinnerAnnouncementDto })
  @ApiResponse({
    status: 200,
    description: 'Winner announcements sent successfully',
    schema: { example: { message: 'Winner announcements sent successfully' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or email addresses',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async announceWinners(
    @Body() winnerAnnouncementDto: WinnerAnnouncementDto,
  ): Promise<{ message: string }> {
    this.emailsService.sendWinnerAnnouncement(
      winnerAnnouncementDto.contestName,
      winnerAnnouncementDto.winnerEmails,
    );
    return { message: 'Winner announcements sent successfully' };
  }
}
