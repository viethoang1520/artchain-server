import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { MailOptionsDto } from './dto/mail-options.dto';
import { Contest, ContestStatus } from '../contests/entities/contests.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  constructor(
    private readonly mailService: MailerService,
    @InjectRepository(Contest)
    private readonly contestRepository: Repository<Contest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationsService,
  ) {}

  async sendMail(mailOptions: MailOptionsDto): Promise<void> {
    this.logger.log(`Sending email to: ${mailOptions.to.join(', ')}`);
    const { from, to, subject, text } = mailOptions;
    for (const recipient of to) {
      this.mailService.sendMail({ from, to: recipient, subject, text }).catch((error) => {
        this.logger.error(
          `Failed to send email to ${recipient}: ${error.message}`,
        );
      });
      const user = await this.userRepository.findOne({
        where: { email: recipient },
        relations: { pushTokens: true },
      });
      if (!user) continue;
      if (user.pushTokens.length === 0) continue;
      const tokens = user.pushTokens.map((token) => token.tokenValue);
      this.notificationService.pushNotificationByTokens(tokens, {
        title: subject,
        body: text,
      });
    }
    this.logger.log(`Email sent successfully to: ${mailOptions.to.join(', ')}`);
  }

  async sendNotificationForNewContest(): Promise<void> {
    const latestContest = await this.contestRepository.findOne({
      where: { status: ContestStatus.ACTIVE },
      order: { contestId: 'DESC' }, // hoặc 'id' nếu dùng id tự tăng
    });
    const competitorEmails = await this.userRepository.find({
      where: { role: UserRole.COMPETITOR },
      select: ['email'],
      relations: { pushTokens: true },
    });
    const subject = `Cuộc thi mới: ${latestContest?.title} đã bắt đầu!`;
    const text = `Các em thí sinh thân mến,\n\nChúng tôi rất vui thông báo về cuộc thi mới: ${latestContest?.title}.\n\nHãy chuẩn bị tinh thần và tham gia nhé!\n\nTrân trọng,\nĐội ngũ ArtChain`;
    for (const user of competitorEmails) {
      this.mailService.sendMail({
        to: user.email,
        subject,
        text,
      }).catch((error) => {
        this.logger.error(
          `Failed to send email to ${user.email}: ${error.message}`,
        );
      });
      if (user.pushTokens.length === 0) continue;
      const tokens = user.pushTokens.map((token) => token.tokenValue);
      this.notificationService.pushNotificationByTokens(tokens, {
        title: subject,
        body: text,
        url: latestContest?.bannerUrl,
      });
    }
  }

  async sendWinnerAnnouncement(
    contestName: string,
    winnerEmails: string[],
  ): Promise<void> {
    const subject = `Chúc mừng bạn đã đạt giải thưởng trong cuộc thi: ${contestName}`;
    const text = `Xin chúc mừng!\n\nBạn đã xuất sắc đạt giải thưởng trong cuộc thi: ${contestName}.\n\nChúng tôi sẽ liên hệ với bạn để trao giải thưởng.\n\nTrân trọng,\nĐội ngũ ArtChain`;
    for (const email of winnerEmails) {
      this.mailService.sendMail({
        to: email,
        subject,
        text,
      }).catch((error) => {
        this.logger.error(
          `Failed to send email to ${email}: ${error.message}`,
        );
      });
      const user = await this.userRepository.findOne({
        where: { email: email },
        relations: { pushTokens: true },
      });
      if (!user) continue;
      if (user.pushTokens.length === 0) continue;
      const tokens = user.pushTokens.map((token) => token.tokenValue);
      this.notificationService.pushNotificationByTokens(tokens, {
        title: subject,
        body: text,
      });
    }
  }
}
