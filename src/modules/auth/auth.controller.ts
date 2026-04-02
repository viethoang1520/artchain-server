import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { Response } from 'express';

@Controller('/api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  async login(@Body() loginDto: LoginDTO): Promise<{ access_token: string }> {
    try {
      return await this.authService.login(loginDto);
    } catch (error) {
      throw new BadRequestException(error.message || 'Login failed');
    }
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDTO): Promise<any> {
    try {
      return await this.authService.register(registerDto);
    } catch (error) {
      throw new BadRequestException(error.message || 'Registration failed');
    }
  }

  @Get('confirm-email')
  async confirmEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.authService.confirmEmail(token);
      res.redirect('https://artchain.io.vn/auth');
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Email confirmation failed',
      );
    }
  }
}
