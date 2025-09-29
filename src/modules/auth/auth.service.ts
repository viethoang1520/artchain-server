import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService
  ) { }

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

    const payload = { sub: user.accountId, username: user.username };
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
    };
  }
  
  async register(registerDto: RegisterDTO) {
    const { username, email, password } = registerDto;

    const existingUser = await this.userRepo.findOne({ where: [{ email }, { username }] });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepo.create({
      username,
      email,
      password: hashedPassword,
    });

    await this.userRepo.save(newUser);

    const { password: _, ...result } = newUser;
    return result;
  }
}
