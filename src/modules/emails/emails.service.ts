import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { MailOptionsDto } from './dto/mail-options.dto';
import { Contest, ContestStatus } from '../contests/entities/contests.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  constructor(
    private readonly mailService: MailerService,
    @InjectRepository(Contest)
    private readonly contestRepository: Repository<Contest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async sendMail(mailOptions: MailOptionsDto): Promise<void> {
    this.logger.log(`Sending email to: ${mailOptions.to.join(', ')}`);
    const { from, to, subject, text } = mailOptions;
    for (const recipient of to) {
      await this.mailService.sendMail({ from, to: recipient, subject, text });
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
    });
    const subject = `Cuộc thi mới: ${latestContest?.title} đã bắt đầu!`;
    const text = `Các em thí sinh thân mến,\n\nChúng tôi rất vui thông báo về cuộc thi mới: ${latestContest?.title}.\n\nHãy chuẩn bị tinh thần và tham gia nhé!\n\nTrân trọng,\nĐội ngũ ArtChain`;
    for (const user of competitorEmails) {
      await this.mailService.sendMail({
        to: user.email,
        subject,
        text,
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
      await this.mailService.sendMail({
        to: email,
        subject,
        text,
      });
    }
  }
}
