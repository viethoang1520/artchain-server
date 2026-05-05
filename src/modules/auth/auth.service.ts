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
import { createHash } from 'crypto';

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
  ) { }

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User();
    newUser.username = username;
    newUser.password = hashedPassword;
    newUser.fullName = fullName;
    newUser.email = email;
    newUser.role = role as UserRole;
    newUser.status = UserStatus.ACTIVE;
    newUser.emailVerifiedAt = new Date();
    newUser.emailVerificationTokenHash = null;
    newUser.emailVerificationTokenExpiresAt = null;
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

    const { password: _, ...result } = newUser;
    return {
      ...result,
      requiresEmailConfirmation: false,
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
