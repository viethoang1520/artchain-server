import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Examiner } from '../examiners/entities/examiners.entity';
import { EmailsService } from '../emails/emails.service';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { access, readFile } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Competitor)
    private competitorRepo: Repository<Competitor>,
    @InjectRepository(Examiner)
    private examinerRepository: Repository<Examiner>,
    private jwtService: JwtService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
  ) {}

  private buildAppUrl(): string {
    const explicit =
      this.configService.get<string>('APP_URL') ||
      this.configService.get<string>('SERVER_URL');
    if (explicit) return explicit.replace(/\/$/, '');

    const portRaw = this.configService.get<string>('PORT') || '3000';
    const port = Number(portRaw) || 3000;
    return `http://localhost:${port}`;
  }

  private generateEmailVerificationToken(): {
    token: string;
    tokenHash: string;
  } {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async getConfirmEmailTemplatePath(): Promise<string> {
    const candidates = [
      join(
        process.cwd(),
        'dist',
        'modules',
        'emails',
        'templates',
        'confirm-email.html',
      ),
      join(
        process.cwd(),
        'src',
        'modules',
        'emails',
        'templates',
        'confirm-email.html',
      ),
      join(__dirname, '..', 'emails', 'templates', 'confirm-email.html'),
    ];

    for (const filePath of candidates) {
      try {
        await access(filePath, constants.F_OK);
        return filePath;
      } catch {
      }
    }

    throw new BadRequestException(
      'Không tìm thấy file template email xác nhận',
    );
  }

  private async buildConfirmEmailHtml(
    userName: string,
    confirmUrl: string,
  ): Promise<string> {
    const templatePath = await this.getConfirmEmailTemplatePath();
    const template = await readFile(templatePath, 'utf8');

    return template
      .replace(/{{USER_NAME}}/g, this.escapeHtml(userName))
      .replace(/{{CONFIRM_URL}}/g, confirmUrl);
  }

  async login(loginDto: LoginDTO) {
    const { username, password } = loginDto;

    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const isActive = user.status === UserStatus.ACTIVE;
    if (!isActive) {
      if (!user.emailVerifiedAt) {
        throw new UnauthorizedException(
          'Vui lòng xác minh email của bạn trước khi đăng nhập',
        );
      }
      throw new UnauthorizedException(
        'Tài khoản người dùng đã bị cấm hoặc không hoạt động',
      );
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const payload = { sub: user.userId, username: user.username };
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
    };
  }

  async register(registerDto: RegisterDTO) {
    const {
      username,
      email: emailRaw,
      password,
      fullName,
      role,
      birthday,
      schoolName,
      ward,
      grade,
    } = registerDto;

    const email = (emailRaw || '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existingUser = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existingUser) {
      throw new BadRequestException(
        'Người dùng đã tồn tại với email hoặc tên đăng nhập này',
      );
    }

    const { token, tokenHash } = this.generateEmailVerificationToken();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User();
    newUser.username = username;
    newUser.password = hashedPassword;
    newUser.fullName = fullName;
    newUser.email = email;
    newUser.role = role as UserRole;
    newUser.status = UserStatus.INACTIVE;
    newUser.emailVerifiedAt = null;
    newUser.emailVerificationTokenHash = tokenHash;
    newUser.emailVerificationTokenExpiresAt = tokenExpiresAt;
    await this.userRepo.save(newUser);

    if (role === UserRole.COMPETITOR) {
      const competitor = new Competitor();
      competitor.competitorId = newUser.userId;
      competitor.birthday = birthday;
      competitor.schoolName = schoolName;
      competitor.ward = ward;
      competitor.grade = grade;

      await this.competitorRepo.save(competitor);
    }
    if (role === UserRole.EXAMINER) {
      const examiner = new Examiner();
      examiner.examinerId = newUser.userId;
      await this.examinerRepository.save(examiner);
    }

    const confirmUrl = `${this.buildAppUrl()}/api/auth/confirm-email?token=${token}`;
    const displayName = fullName || username;
    const html = await this.buildConfirmEmailHtml(displayName, confirmUrl);
    await this.emailsService.sendMail({
      to: [email],
      subject: 'Xác nhận thông tin đăng ký tài khoản',
      text:
        `Xin chào ${displayName},\n\n` +
        `Vui lòng xác nhận email của bạn để kích hoạt tài khoản bằng cách nhấn vào liên kết dưới đây:\n` +
        `${confirmUrl}\n\n` +
        `Liên kết này sẽ hết hạn sau 24 giờ.\n\n` +
        `Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.`,
      html,
    });

    const { password: _, ...result } = newUser;
    return {
      ...result,
      requiresEmailConfirmation: true,
    };
  }

  async confirmEmail(token: string) {
    const raw = (token || '').trim();
    if (!raw) {
      throw new BadRequestException('Token is required');
    }
    const tokenHash = createHash('sha256').update(raw).digest('hex');

    const user = await this.userRepo.findOne({
      where: { emailVerificationTokenHash: tokenHash },
    });
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Đã hết hạn token xác minh email');
    }

    user.status = UserStatus.ACTIVE;
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = null;
    user.emailVerificationTokenExpiresAt = null;
    await this.userRepo.save(user);

    return {
      message: 'Email đã được xác nhận. Tài khoản của bạn đã được kích hoạt.',
    };
  }
}
