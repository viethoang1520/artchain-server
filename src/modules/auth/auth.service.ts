import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Competitor } from '../competitors/entities/competitors.entity';
import { Examiner } from '../examiners/entities/examiners.entity';

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
  ) {}

  async login(loginDto: LoginDTO) {
    const { username, password } = loginDto;

    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
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
      email,
      password,
      fullName,
      role,
      birthday,
      schoolName,
      ward,
      grade,
    } = registerDto;

    const existingUser = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User();
    newUser.username = username;
    newUser.password = hashedPassword;
    newUser.fullName = fullName;
    newUser.email = email;
    newUser.role = role as UserRole;
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
    return result;
  }
}
